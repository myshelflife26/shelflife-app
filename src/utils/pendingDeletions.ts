import type { PendingDeletion } from '../types/user';
import type { ActionFigure } from '../types/index';
import { Storage } from './storage';
import { AuthService } from './auth';

const PENDING_DELETIONS_KEY = 'pending-deletions';
const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export class PendingDeletionsService {
  // Get all pending deletions
  static getAll(): PendingDeletion[] {
    try {
      const data = localStorage.getItem(PENDING_DELETIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading pending deletions:', error);
      return [];
    }
  }

  // Save all pending deletions
  private static saveAll(deletions: PendingDeletion[]): void {
    try {
      localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(deletions));
    } catch (error) {
      console.error('Error saving pending deletions:', error);
    }
  }

  // Schedule a figure for deletion
  static scheduleDeletion(figure: ActionFigure, userId: string, reason?: string): PendingDeletion {
    const deletions = this.getAll();
    const now = Date.now();

    const pendingDeletion: PendingDeletion = {
      id: crypto.randomUUID(),
      figureId: figure.id,
      figureName: figure.name,
      userId: userId,
      scheduledAt: now,
      executeAt: now + TWO_HOURS,
      reason: reason
    };

    deletions.push(pendingDeletion);
    this.saveAll(deletions);

    // Send email notification (placeholder for now)
    this.sendEmailNotification(userId, figure.name, pendingDeletion.executeAt, reason);

    return pendingDeletion;
  }

  // Cancel a pending deletion
  static cancelDeletion(deletionId: string): boolean {
    const deletions = this.getAll();
    const filtered = deletions.filter(d => d.id !== deletionId);

    if (filtered.length === deletions.length) {
      return false; // Not found
    }

    this.saveAll(filtered);
    return true;
  }

  // Get pending deletions for a specific figure
  static getPendingForFigure(figureId: string, userId: string): PendingDeletion | null {
    const deletions = this.getAll();
    return deletions.find(d => d.figureId === figureId && d.userId === userId) || null;
  }

  // Execute all pending deletions that are due
  static executeScheduledDeletions(): number {
    const deletions = this.getAll();
    const now = Date.now();
    let executed = 0;

    const toExecute = deletions.filter(d => d.executeAt <= now);
    const remaining = deletions.filter(d => d.executeAt > now);

    // Execute deletions
    toExecute.forEach(deletion => {
      try {
        Storage.deleteFromUser(deletion.figureId, deletion.userId);
        executed++;
        console.log(`Executed scheduled deletion: ${deletion.figureName} from user ${deletion.userId}`);
      } catch (error) {
        console.error(`Failed to execute deletion for ${deletion.figureName}:`, error);
      }
    });

    // Save remaining deletions
    this.saveAll(remaining);

    return executed;
  }

  // Get time remaining for a pending deletion in a human-readable format
  static getTimeRemaining(deletion: PendingDeletion): string {
    const now = Date.now();
    const remaining = deletion.executeAt - now;

    if (remaining <= 0) {
      return 'Executing soon...';
    }

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Send email notification (placeholder - will be implemented later)
  private static sendEmailNotification(userId: string, figureName: string, executeAt: number, reason?: string): void {
    // Get user email
    const users = AuthService.getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user || !user.email) {
      console.log('No email configured for user, skipping notification');
      return;
    }

    // Placeholder for email sending
    const executeDate = new Date(executeAt).toLocaleString();
    console.log('=== EMAIL NOTIFICATION (Placeholder) ===');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Warning - Figure Scheduled for Deletion`);
    console.log(`Body:`);
    console.log(`  Dear ${user.displayName},`);
    console.log(``);
    console.log(`  Your figure "${figureName}" has been flagged by an administrator and is scheduled for deletion.`);
    console.log(``);
    console.log(`  Deletion Time: ${executeDate}`);
    if (reason) {
      console.log(`  Reason: ${reason}`);
    }
    console.log(``);
    console.log(`  If you believe this is an error, please contact support immediately.`);
    console.log(``);
    console.log(`  Best regards,`);
    console.log(`  ShelfLife Team`);
    console.log('========================================');

    // TODO: Implement actual email sending using email service
    // Example: EmailService.send(user.email, subject, body);
  }

  // Get all pending deletions for a specific user
  static getPendingForUser(userId: string): PendingDeletion[] {
    return this.getAll().filter(d => d.userId === userId);
  }

  // Get count of pending deletions
  static getCount(): number {
    return this.getAll().length;
  }
}
