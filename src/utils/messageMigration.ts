import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FirebaseConversationsService } from './firebaseConversations';
import type { Message } from '../types/user';

const OLD_MESSAGES_COLLECTION = 'messages';

interface OldMessage {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  subject: string;
  message: string;
  timestamp: number;
  read: boolean;
  figureId?: string;
  figureName?: string;
}

export class MessageMigrationService {
  /**
   * Migrate all old flat messages to conversation-based format
   * This should be run once to convert existing messages
   */
  static async migrateAllMessages(): Promise<{
    success: boolean;
    conversationsCreated: number;
    messagesMigrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let conversationsCreated = 0;
    let messagesMigrated = 0;

    try {
      console.log('Starting message migration...');

      // Get all old messages
      const messagesQuery = query(
        collection(db, OLD_MESSAGES_COLLECTION),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(messagesQuery);
      const oldMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OldMessage));

      console.log(`Found ${oldMessages.length} old messages to migrate`);

      // Group messages by conversation (based on participants)
      const conversationGroups = new Map<string, OldMessage[]>();

      for (const message of oldMessages) {
        // Create a unique key for conversation between these two users
        const participants = [message.fromUserId, message.toUserId].sort();
        const conversationKey = participants.join('_');

        if (!conversationGroups.has(conversationKey)) {
          conversationGroups.set(conversationKey, []);
        }
        conversationGroups.get(conversationKey)!.push(message);
      }

      console.log(`Grouped into ${conversationGroups.size} conversations`);

      // Create conversations and migrate messages
      for (const [conversationKey, messages] of conversationGroups.entries()) {
        try {
          // Get participant info from first message
          const firstMessage = messages[0];
          const participants = [firstMessage.fromUserId, firstMessage.toUserId];

          // Build participant names map
          const participantNames: { [userId: string]: string } = {};

          // Collect names from all messages in this conversation
          for (const msg of messages) {
            if (!participantNames[msg.fromUserId]) {
              participantNames[msg.fromUserId] = msg.fromDisplayName;
            }
            // Try to get receiver name from other messages where they are the sender
            const reverseMessage = messages.find(m => m.fromUserId === msg.toUserId);
            if (reverseMessage && !participantNames[msg.toUserId]) {
              participantNames[msg.toUserId] = reverseMessage.fromDisplayName;
            }
          }

          // If we still don't have both names, use placeholder
          for (const participantId of participants) {
            if (!participantNames[participantId]) {
              participantNames[participantId] = `User ${participantId.substring(0, 8)}`;
            }
          }

          // Find if any message has figure info
          const messageWithFigure = messages.find(m => m.figureId);

          // Create or get conversation
          const conversationId = await FirebaseConversationsService.createOrGetConversation(
            participants,
            participantNames,
            messageWithFigure?.figureId,
            messageWithFigure?.figureName
          );

          conversationsCreated++;

          // Migrate each message
          for (const oldMessage of messages) {
            try {
              await FirebaseConversationsService.sendMessage(
                conversationId,
                oldMessage.fromUserId,
                oldMessage.fromDisplayName,
                oldMessage.message
              );
              messagesMigrated++;
            } catch (error) {
              const errorMsg = `Failed to migrate message ${oldMessage.id}: ${error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }

          console.log(`Migrated conversation ${conversationsCreated}/${conversationGroups.size}`);
        } catch (error) {
          const errorMsg = `Failed to create conversation for ${conversationKey}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log('Migration completed!');
      console.log(`- Conversations created: ${conversationsCreated}`);
      console.log(`- Messages migrated: ${messagesMigrated}`);
      console.log(`- Errors: ${errors.length}`);

      return {
        success: errors.length === 0,
        conversationsCreated,
        messagesMigrated,
        errors
      };
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);

      return {
        success: false,
        conversationsCreated,
        messagesMigrated,
        errors
      };
    }
  }

  /**
   * Check if migration is needed
   * Returns true if there are old messages that haven't been migrated
   */
  static async needsMigration(): Promise<boolean> {
    try {
      const messagesQuery = query(
        collection(db, OLD_MESSAGES_COLLECTION),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(messagesQuery);
      return snapshot.size > 0;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Get migration statistics
   */
  static async getMigrationStats(): Promise<{
    oldMessagesCount: number;
    conversationsCount: number;
  }> {
    try {
      // Count old messages
      const messagesQuery = query(collection(db, OLD_MESSAGES_COLLECTION));
      const messagesSnapshot = await getDocs(messagesQuery);

      // Count conversations
      const conversationsQuery = query(collection(db, 'conversations'));
      const conversationsSnapshot = await getDocs(conversationsQuery);

      return {
        oldMessagesCount: messagesSnapshot.size,
        conversationsCount: conversationsSnapshot.size
      };
    } catch (error) {
      console.error('Failed to get migration stats:', error);
      return {
        oldMessagesCount: 0,
        conversationsCount: 0
      };
    }
  }
}
