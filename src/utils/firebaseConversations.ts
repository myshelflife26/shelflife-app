import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BlockingService } from './blocking';
import type { Conversation, Message } from '../types/user';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

export class FirebaseConversationsService {
  /**
   * Create or get existing conversation between users
   * @returns conversationId
   */
  static async createOrGetConversation(
    participantIds: string[],
    participantNames: { [userId: string]: string },
    figureId?: string,
    figureName?: string
  ): Promise<string> {
    try {
      // Sort participant IDs for consistent lookup
      const sortedParticipants = [...participantIds].sort();

      // Check if conversation already exists between these users
      const q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('participants', '==', sortedParticipants)
      );

      const snapshot = await getDocs(q);

      // If conversation exists, return its ID
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create new conversation
      const conversationData: Omit<Conversation, 'id'> = {
        participants: sortedParticipants,
        participantNames,
        lastMessage: '',
        lastMessageTimestamp: Date.now(),
        lastMessageSenderId: '',
        unreadCount: sortedParticipants.reduce((acc, userId) => {
          acc[userId] = 0;
          return acc;
        }, {} as { [userId: string]: number }),
        figureId,
        figureName,
        archived: {},
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Failed to create or get conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string, includeArchived: boolean = false): Promise<Conversation[]> {
    try {
      const q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTimestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Conversation));

      // Filter out conversations with blocked users
      const filteredConversations = conversations.filter(conv => {
        const otherParticipants = conv.participants.filter(p => p !== userId);
        return !otherParticipants.some(p =>
          BlockingService.isUserBlocked(userId, p) ||
          BlockingService.isUserBlocked(p, userId)
        );
      });

      // Filter archived if needed
      if (!includeArchived) {
        return filteredConversations.filter(conv => !conv.archived?.[userId]);
      }

      return filteredConversations;
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      return [];
    }
  }

  /**
   * Get a single conversation by ID
   */
  static async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationDoc = await getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));

      if (!conversationDoc.exists()) {
        return null;
      }

      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      } as Conversation;
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return null;
    }
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(
    conversationId: string,
    fromUserId: string,
    fromDisplayName: string,
    message: string,
    replyToMessageId?: string
  ): Promise<Message | null> {
    try {
      const messageData: Omit<Message, 'id'> = {
        conversationId,
        fromUserId,
        fromDisplayName,
        message,
        timestamp: Date.now(),
        readBy: [fromUserId], // Sender has automatically read it
        replyToMessageId,
        edited: false
      };

      // Add message to conversation's messages subcollection
      const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
      const docRef = await addDoc(messagesRef, messageData);

      // Update conversation's last message info
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        const updatedUnreadCount = { ...conversation.unreadCount };

        // Increment unread count for all participants except sender
        conversation.participants.forEach(participantId => {
          if (participantId !== fromUserId) {
            updatedUnreadCount[participantId] = (updatedUnreadCount[participantId] || 0) + 1;
          }
        });

        await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
          lastMessage: message.substring(0, 100), // Preview (first 100 chars)
          lastMessageTimestamp: messageData.timestamp,
          lastMessageSenderId: fromUserId,
          unreadCount: updatedUnreadCount
        });
      }

      return {
        id: docRef.id,
        ...messageData
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }

  /**
   * Get messages in a conversation
   */
  static async getMessages(conversationId: string, limit?: number): Promise<Message[]> {
    try {
      const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
      const q = limit
        ? query(messagesRef, orderBy('timestamp', 'desc'), orderBy('timestamp', 'asc'))
        : query(messagesRef, orderBy('timestamp', 'asc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  /**
   * Mark conversation as read for a user
   */
  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) return;

      // Reset unread count for this user
      const updatedUnreadCount = { ...conversation.unreadCount };
      updatedUnreadCount[userId] = 0;

      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
        unreadCount: updatedUnreadCount
      });

      // Mark all messages in conversation as read by this user
      const messages = await this.getMessages(conversationId);
      const updatePromises = messages
        .filter(msg => !msg.readBy.includes(userId))
        .map(msg => {
          const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, msg.id);
          return updateDoc(messageRef, {
            readBy: [...msg.readBy, userId]
          });
        });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  /**
   * Archive/unarchive a conversation for a user
   */
  static async toggleArchive(conversationId: string, userId: string, archived: boolean): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) return;

      const updatedArchived = { ...conversation.archived };
      updatedArchived[userId] = archived;

      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
        archived: updatedArchived
      });
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  }

  /**
   * Delete a conversation (for all participants)
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Delete all messages first
      const messages = await this.getMessages(conversationId);
      const deleteMessagePromises = messages.map(msg =>
        deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, msg.id))
      );
      await Promise.all(deleteMessagePromises);

      // Delete conversation
      await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  /**
   * Get total unread count across all conversations for a user
   */
  static async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getUserConversations(userId, false);
      return conversations.reduce((total, conv) => total + (conv.unreadCount[userId] || 0), 0);
    } catch (error) {
      console.error('Failed to get total unread count:', error);
      return 0;
    }
  }

  /**
   * Search conversations by participant name or message content
   */
  static async searchConversations(userId: string, searchQuery: string): Promise<Conversation[]> {
    try {
      const conversations = await this.getUserConversations(userId, false);
      const lowerQuery = searchQuery.toLowerCase();

      // Filter by participant names
      const matchingConversations = conversations.filter(conv => {
        // Check participant names
        const participantNamesMatch = Object.values(conv.participantNames).some(name =>
          name.toLowerCase().includes(lowerQuery)
        );

        // Check last message
        const lastMessageMatch = conv.lastMessage.toLowerCase().includes(lowerQuery);

        // Check figure name if exists
        const figureNameMatch = conv.figureName?.toLowerCase().includes(lowerQuery);

        return participantNamesMatch || lastMessageMatch || figureNameMatch;
      });

      return matchingConversations;
    } catch (error) {
      console.error('Failed to search conversations:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time conversation updates
   */
  static subscribeToConversation(conversationId: string, callback: (messages: Message[]) => void): Unsubscribe {
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      callback(messages);
    });
  }

  /**
   * Subscribe to real-time conversations list updates
   */
  static subscribeToUserConversations(userId: string, callback: (conversations: Conversation[]) => void): Unsubscribe {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Conversation));

      // Filter out blocked users
      const filteredConversations = conversations.filter(conv => {
        const otherParticipants = conv.participants.filter(p => p !== userId);
        return !otherParticipants.some(p =>
          BlockingService.isUserBlocked(userId, p) ||
          BlockingService.isUserBlocked(p, userId)
        );
      });

      callback(filteredConversations);
    });
  }

  /**
   * Edit a message
   */
  static async editMessage(conversationId: string, messageId: string, newContent: string): Promise<void> {
    try {
      const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, messageId);
      await updateDoc(messageRef, {
        message: newContent,
        edited: true,
        editedAt: Date.now()
      });

      // Update conversation's last message if this was the last message
      const conversation = await this.getConversation(conversationId);
      const messages = await this.getMessages(conversationId);
      const latestMessage = messages[messages.length - 1];

      if (latestMessage?.id === messageId) {
        await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
          lastMessage: newContent.substring(0, 100)
        });
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }

  /**
   * Delete a message (marks as deleted, doesn't remove from DB)
   */
  static async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, messageId);
      await updateDoc(messageRef, {
        message: '[Message deleted]',
        edited: true,
        editedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }
}
