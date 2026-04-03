import type { Message } from '../types/user';

const MESSAGES_KEY = 'app-messages';

export class MessagesService {
  // Get all messages
  static getAll(): Message[] {
    try {
      const data = localStorage.getItem(MESSAGES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading messages:', error);
      return [];
    }
  }

  // Save all messages
  private static saveAll(messages: Message[]): void {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  // Check if users are blocked (inline to avoid circular dependency)
  private static areUsersBlocked(userId1: string, userId2: string): boolean {
    try {
      // Check if userId1 blocked userId2
      const blocked1Key = `blocked-users-${userId1}`;
      const blocked1Data = localStorage.getItem(blocked1Key);
      const blocked1List = blocked1Data ? JSON.parse(blocked1Data) : [];

      if (blocked1List.includes(userId2)) return true;

      // Check if userId2 blocked userId1
      const blocked2Key = `blocked-users-${userId2}`;
      const blocked2Data = localStorage.getItem(blocked2Key);
      const blocked2List = blocked2Data ? JSON.parse(blocked2Data) : [];

      if (blocked2List.includes(userId1)) return true;

      return false;
    } catch (error) {
      console.error('Error checking blocked users:', error);
      return false;
    }
  }

  // Send a message
  static send(
    fromUserId: string,
    fromDisplayName: string,
    toUserId: string,
    subject: string,
    message: string,
    figureId?: string,
    figureName?: string
  ): Message | null {
    // Check if users are blocked
    if (this.areUsersBlocked(fromUserId, toUserId)) {
      console.warn('Cannot send message between blocked users');
      return null;
    }

    const messages = this.getAll();

    const newMessage: Message = {
      id: crypto.randomUUID(),
      fromUserId,
      fromDisplayName,
      toUserId,
      subject,
      message,
      figureId,
      figureName,
      timestamp: Date.now(),
      read: false
    };

    messages.push(newMessage);
    this.saveAll(messages);

    return newMessage;
  }

  // Get messages for a user (inbox)
  static getInbox(userId: string): Message[] {
    return this.getAll()
      .filter(m => {
        if (m.toUserId !== userId) return false;
        // Filter out messages from blocked users
        return !this.areUsersBlocked(userId, m.fromUserId);
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }

  // Get sent messages for a user
  static getSent(userId: string): Message[] {
    return this.getAll()
      .filter(m => {
        if (m.fromUserId !== userId) return false;
        // Filter out messages to blocked users
        return !this.areUsersBlocked(userId, m.toUserId);
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }

  // Mark message as read
  static markAsRead(messageId: string): void {
    const messages = this.getAll();
    const message = messages.find(m => m.id === messageId);

    if (message) {
      message.read = true;
      this.saveAll(messages);
    }
  }

  // Mark all messages as read for a user
  static markAllAsRead(userId: string): void {
    const messages = this.getAll();
    let changed = false;

    messages.forEach(m => {
      if (m.toUserId === userId && !m.read) {
        m.read = true;
        changed = true;
      }
    });

    if (changed) {
      this.saveAll(messages);
    }
  }

  // Delete a message
  static delete(messageId: string): void {
    const messages = this.getAll();
    const filtered = messages.filter(m => m.id !== messageId);
    this.saveAll(filtered);
  }

  // Get unread count for a user
  static getUnreadCount(userId: string): number {
    return this.getAll().filter(m => m.toUserId === userId && !m.read).length;
  }

  // Get a single message by ID
  static getById(messageId: string): Message | null {
    return this.getAll().find(m => m.id === messageId) || null;
  }
}
