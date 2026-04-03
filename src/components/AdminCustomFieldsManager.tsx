import { useState, useEffect, useMemo } from 'react';
import { SettingsService } from '../utils/settings';
import { PendingCustomFieldDeletionsService } from '../utils/pendingCustomFieldDeletions';
import { CustomFieldUsageService } from '../utils/customFieldUsage';
import type { CustomField } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CustomFieldUsageDialog } from './CustomFieldUsageDialog';
import { Trash2, AlertTriangle, ChevronDown, ChevronUp, Search, Clock, X } from 'lucide-react';

interface UserCustomFields {
  userId: string;
  username: string;
  displayName: string;
  fields: CustomField[];
}

interface AdminCustomFieldsManagerProps {
  onFieldsChange: () => void;
}

export function AdminCustomFieldsManager({ onFieldsChange }: AdminCustomFieldsManagerProps) {
  const [allUsersFields, setAllUsersFields] = useState<UserCustomFields[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeletions, setPendingDeletions] = useState(PendingCustomFieldDeletionsService.getAll());
  const [usageDialog, setUsageDialog] = useState<{
    userId: string;
    fieldId: string;
    fieldName: string;
    username: string;
    deleteType: 'immediate' | 'delayed';
    field: CustomField;
  } | null>(null);

  useEffect(() => {
    // Execute any scheduled deletions that are due
    PendingCustomFieldDeletionsService.executeScheduledDeletions();
    loadAllUsersFields();
    setPendingDeletions(PendingCustomFieldDeletionsService.getAll());

    // Set up interval to check for due deletions every minute
    const interval = setInterval(() => {
      const executed = PendingCustomFieldDeletionsService.executeScheduledDeletions();
      if (executed > 0) {
        loadAllUsersFields();
        setPendingDeletions(PendingCustomFieldDeletionsService.getAll());
        onFieldsChange();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [onFieldsChange]);

  const loadAllUsersFields = () => {
    const data = SettingsService.getAllUsersCustomFields();
    // Only show users who have custom fields
    setAllUsersFields(data.filter(u => u.fields.length > 0));
  };

  const handleDelayedDelete = (field: CustomField, userId: string, username: string) => {
    // Show usage dialog first
    setUsageDialog({
      userId,
      fieldId: field.id,
      fieldName: field.name,
      username,
      deleteType: 'delayed',
      field
    });
  };

  const handleImmediateDelete = (field: CustomField, userId: string, username: string) => {
    // Show usage dialog first
    setUsageDialog({
      userId,
      fieldId: field.id,
      fieldName: field.name,
      username,
      deleteType: 'immediate',
      field
    });
  };

  const handleConfirmDelete = () => {
    if (!usageDialog) return;

    const { userId, fieldId, fieldName, username, deleteType, field } = usageDialog;

    if (deleteType === 'delayed') {
      // Delayed deletion - schedule it
      const reason = prompt(`Schedule deletion of custom field "${fieldName}" from user ${username}?\n\nOptional: Enter reason for deletion (will be sent to user):`);

      if (reason !== null) { // null means cancelled, empty string is valid
        PendingCustomFieldDeletionsService.scheduleDeletion(field, userId, username, reason || undefined);
        setPendingDeletions(PendingCustomFieldDeletionsService.getAll());
        alert(`Custom field "${fieldName}" scheduled for deletion in 2 hours. User will be notified.`);
      }
    } else {
      // Immediate deletion
      SettingsService.deleteCustomFieldForUser(userId, fieldId);
      loadAllUsersFields();
      onFieldsChange();
      alert(`Custom field "${fieldName}" has been immediately deleted.`);
    }

    setUsageDialog(null);
  };

  const handleCancelDeletion = (deletionId: string, fieldName: string) => {
    if (confirm(`Cancel scheduled deletion of "${fieldName}"?`)) {
      PendingCustomFieldDeletionsService.cancelDeletion(deletionId);
      setPendingDeletions(PendingCustomFieldDeletionsService.getAll());
      alert('Deletion cancelled successfully.');
    }
  };

  // Get total count of custom fields
  const totalFieldCount = useMemo(() => {
    return allUsersFields.reduce((sum, user) => sum + user.fields.length, 0);
  }, [allUsersFields]);

  // Flatten and sort all fields by field ID (descending) to show most recent first
  // Field IDs are UUIDs, but we'll sort them in reverse order as a proxy for "recent"
  const allFieldsFlattened = useMemo(() => {
    const fields: Array<{ user: UserCustomFields; field: CustomField }> = [];
    allUsersFields.forEach(user => {
      user.fields.forEach(field => {
        fields.push({ user, field });
      });
    });
    // Sort by field ID in reverse (most recent IDs tend to be later)
    return fields.reverse();
  }, [allUsersFields]);

  // Filter fields by search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) {
      return allFieldsFlattened.slice(0, 20); // Show top 20 recent
    }
    const query = searchQuery.toLowerCase();
    return allFieldsFlattened.filter(item =>
      item.field.name.toLowerCase().includes(query) ||
      item.user.displayName.toLowerCase().includes(query) ||
      item.user.username.toLowerCase().includes(query)
    );
  }, [allFieldsFlattened, searchQuery]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            All Users' Custom Fields (Admin View)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {allUsersFields.length} user{allUsersFields.length !== 1 ? 's' : ''} • {totalFieldCount} total field{totalFieldCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage custom fields for all users. Use with caution - deleting fields will affect users' data.
          </p>

          {/* Pending Deletions */}
          {pendingDeletions.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Deletions ({pendingDeletions.length})
              </h4>
              <div className="space-y-2">
                {pendingDeletions.map(deletion => (
                  <div
                    key={deletion.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {deletion.fieldName}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        User: {deletion.username} • Deletes in {PendingCustomFieldDeletionsService.getTimeRemaining(deletion)}
                      </div>
                      {deletion.reason && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Reason: {deletion.reason}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelDeletion(deletion.id, deletion.fieldName)}
                      title="Cancel deletion"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allUsersFields.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
              No users have created custom fields yet.
            </p>
          ) : (
            <>
              {/* Search Box */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by field name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {searchQuery ? `Showing ${filteredFields.length} matching fields` : `Showing ${filteredFields.length} most recent fields`}
                </p>
              </div>

              {/* Fields List */}
              {filteredFields.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                  No fields found matching "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredFields.map(({ user, field }) => {
                    const hasPending = PendingCustomFieldDeletionsService.hasPendingDeletion(field.id, user.userId);

                    return (
                      <div
                        key={`${user.userId}-${field.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {field.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                                required
                              </span>
                            )}
                            {hasPending && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Pending Deletion
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>Owner: {user.displayName} ({user.username})</span>
                            {field.type === 'select' && field.options && (
                              <span className="text-gray-500 dark:text-gray-500">
                                • Options: {field.options.slice(0, 3).join(', ')}{field.options.length > 3 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                            onClick={() => handleDelayedDelete(field, user.userId, user.username)}
                            disabled={hasPending}
                            title="Schedule deletion (2 hour delay, user notified)"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Delay Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleImmediateDelete(field, user.userId, user.username)}
                            disabled={hasPending}
                            title="Delete immediately (for sensitive content)"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Now
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Usage Dialog */}
      {usageDialog && (
        <CustomFieldUsageDialog
          userId={usageDialog.userId}
          fieldId={usageDialog.fieldId}
          fieldName={usageDialog.fieldName}
          username={usageDialog.username}
          onClose={() => setUsageDialog(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
}
