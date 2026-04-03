import type { CustomField } from '../types/index';
import { SettingsService } from './settings';
import { AuthService } from './auth';

export interface PendingCustomFieldDeletion {
  id: string;
  fieldId: string;
  fieldName: string;
  userId: string;
  username: string;
  scheduledAt: number;
  executeAt: number;
  reason?: string;
}

const PENDING_CUSTOM_FIELD_DELETIONS_KEY = 'pending-custom-field-deletions';
const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export class PendingCustomFieldDeletionsService {
  // Get all pending deletions
  static getAll(): PendingCustomFieldDeletion[] {
    try {
      const data = localStorage.getItem(PENDING_CUSTOM_FIELD_DELETIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading pending custom field deletions:', error);
      return [];
    }
  }

  // Save all pending deletions
  private static saveAll(deletions: PendingCustomFieldDeletion[]): void {
    try {
      localStorage.setItem(PENDING_CUSTOM_FIELD_DELETIONS_KEY, JSON.stringify(deletions));
    } catch (error) {
      console.error('Error saving pending custom field deletions:', error);
    }
  }

  // Schedule a custom field for deletion
  static scheduleDeletion(
    field: CustomField,
    userId: string,
    username: string,
    reason?: string
  ): PendingCustomFieldDeletion {
    const deletions = this.getAll();
    const now = Date.now();

    const pendingDeletion: PendingCustomFieldDeletion = {
      id: crypto.randomUUID(),
      fieldId: field.id,
      fieldName: field.name,
      userId: userId,
      username: username,
      scheduledAt: now,
      executeAt: now + TWO_HOURS,
      reason: reason
    };

    deletions.push(pendingDeletion);
    this.saveAll(deletions);

    // Send email notification (placeholder for now)
    this.sendEmailNotification(userId, username, field.name, pendingDeletion.executeAt, reason);

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

  // Get pending deletions for a specific field
  static getPendingForField(fieldId: string, userId: string): PendingCustomFieldDeletion | null {
    const deletions = this.getAll();
    return deletions.find(d => d.fieldId === fieldId && d.userId === userId) || null;
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
        SettingsService.deleteCustomFieldForUser(deletion.userId, deletion.fieldId);
        executed++;
        console.log(`Executed scheduled custom field deletion: ${deletion.fieldName} from user ${deletion.username}`);
      } catch (error) {
        console.error(`Failed to execute custom field deletion for ${deletion.fieldName}:`, error);
      }
    });

    // Save remaining deletions
    this.saveAll(remaining);

    return executed;
  }

  // Get time remaining for a pending deletion in a human-readable format
  static getTimeRemaining(deletion: PendingCustomFieldDeletion): string {
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
  private static sendEmailNotification(
    userId: string,
    username: string,
    fieldName: string,
    executeAt: number,
    reason?: string
  ): void {
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
    console.log(`Subject: Warning - Custom Field Scheduled for Deletion`);
    console.log(`Body:`);
    console.log(`  Dear ${user.displayName},`);
    console.log(``);
    console.log(`  Your custom field "${fieldName}" has been flagged by an administrator and is scheduled for deletion.`);
    console.log(``);
    console.log(`  Deletion Time: ${executeDate}`);
    if (reason) {
      console.log(`  Reason: ${reason}`);
    }
    console.log(``);
    console.log(`  All data associated with this field will be permanently removed from your figures.`);
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
  static getPendingForUser(userId: string): PendingCustomFieldDeletion[] {
    return this.getAll().filter(d => d.userId === userId);
  }

  // Get count of pending deletions
  static getCount(): number {
    return this.getAll().length;
  }

  // Check if a field has a pending deletion
  static hasPendingDeletion(fieldId: string, userId: string): boolean {
    return this.getPendingForField(fieldId, userId) !== null;
  }
}
