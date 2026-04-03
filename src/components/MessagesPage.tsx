import { useState, useEffect } from 'react';
import { FirebaseMessagesService } from '../utils/firebaseMessages';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { AdmirersService } from '../utils/admirers';
import type { Message, User } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Inbox, Send, Mail, MailOpen, Trash2, Clock, PenSquare, Info } from 'lucide-react';
import { toastManager } from '../utils/toastManager';

interface MessagesPageProps {
  currentUser: User;
}

type ViewMode = 'inbox' | 'sent';

export function MessagesPage({ currentUser }: MessagesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [composeForm, setComposeForm] = useState({
    toUserId: '',
    subject: '',
    message: ''
  });

  // Load messages
  const loadMessages = async () => {
    if (viewMode === 'inbox') {
      const inboxMessages = await FirebaseMessagesService.getInbox(currentUser.id);
      const unread = await FirebaseMessagesService.getUnreadCount(currentUser.id);
      setMessages(inboxMessages);
      setUnreadCount(unread);
    } else {
      const sentMessages = await FirebaseMessagesService.getSent(currentUser.id);
      setMessages(sentMessages);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [viewMode, currentUser.id]);

  // Handle message click
  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);

    // Mark as read if it's in inbox and unread
    if (viewMode === 'inbox' && !message.read) {
      await FirebaseMessagesService.markAsRead(message.id);
      loadMessages(); // Reload to update unread count
    }
  };

  // Handle delete message
  const handleDelete = async (messageId: string) => {
    if (confirm('Delete this message?')) {
      await FirebaseMessagesService.delete(messageId);
      setSelectedMessage(null);
      loadMessages();
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await FirebaseMessagesService.markAllAsRead(currentUser.id);
    loadMessages();
  };

  // Get available users to message based on role and admirer status
  const getAvailableUsers = async (): Promise<User[]> => {
    const allUsers = (await FirebaseAuthService.getAllUsers()).filter(u => u.id !== currentUser.id);

    // Management can message anyone
    if (currentUser.role === 'management') {
      return allUsers;
    }

    // Free users cannot compose messages
    if (currentUser.subscriptionTier === 'free' && currentUser.role !== 'management') {
      return [];
    }

    // Paid users or regular users can message users they admire or who admire them
    const availableUsers: User[] = [];
    for (const user of allUsers) {
      const isAdmiring = await AdmirersService.isAdmirer(user.id, currentUser.id); // They admire this user
      const isAdmirer = await AdmirersService.isAdmirer(currentUser.id, user.id); // This user admires them
      if (isAdmiring || isAdmirer) {
        availableUsers.push(user);
      }
    }
    return availableUsers;
  };

  // Handle compose message
  const handleCompose = async () => {
    // Check if free user
    if (currentUser.subscriptionTier === 'free' && currentUser.role !== 'management') {
      toastManager.warning('Upgrade your account to send messages to other collectors');
      return;
    }

    setComposeForm({
      toUserId: '',
      subject: '',
      message: ''
    });

    // Load available users
    const users = await getAvailableUsers();
    setAvailableUsers(users);
    setComposeOpen(true);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!composeForm.toUserId || !composeForm.subject || !composeForm.message) {
      toastManager.warning('Please fill in all fields');
      return;
    }

    const allUsers = await FirebaseAuthService.getAllUsers();
    const toUser = allUsers.find(u => u.id === composeForm.toUserId);
    if (!toUser) {
      toastManager.error('Invalid recipient');
      return;
    }

    const result = await FirebaseMessagesService.send(
      currentUser.id,
      currentUser.displayName,
      composeForm.toUserId,
      composeForm.subject,
      composeForm.message
    );

    if (result) {
      toastManager.success(`Message sent to ${toUser.displayName}`);
      setComposeOpen(false);
      setComposeForm({ toUserId: '', subject: '', message: '' });

      // Reload sent messages if viewing sent
      if (viewMode === 'sent') {
        loadMessages();
      }
    } else {
      toastManager.error('Failed to send message');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Messages
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Communicate with other collectors
          </p>
        </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'inbox' ? 'default' : 'outline'}
            onClick={() => setViewMode('inbox')}
          >
            <Inbox className="h-4 w-4 mr-2" />
            Inbox
            {unreadCount > 0 && viewMode === 'inbox' && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </Button>
          <Button
            variant={viewMode === 'sent' ? 'default' : 'outline'}
            onClick={() => setViewMode('sent')}
          >
            <Send className="h-4 w-4 mr-2" />
            Sent
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCompose}
            title={currentUser.subscriptionTier === 'free' ? 'Upgrade to send messages' : 'Compose a new message'}
          >
            <PenSquare className="h-4 w-4 mr-2" />
            Compose
            {currentUser.subscriptionTier === 'free' && (
              <span className="ml-1 text-xs">(Upgrade)</span>
            )}
          </Button>
          {viewMode === 'inbox' && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
            >
              <MailOpen className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {viewMode === 'inbox' ? 'No messages in your inbox' : 'No sent messages'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  viewMode === 'inbox' && !message.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => handleMessageClick(message)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {viewMode === 'inbox' && !message.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {message.subject}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {viewMode === 'inbox' ? `From: ${message.fromDisplayName}` : `To: User`}
                    </p>
                    {message.figureName && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        About: {message.figureName}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mt-2">
                      {message.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatTime(message.timestamp)}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(message.id);
                      }}
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl md:max-w-5xl lg:max-w-6xl">
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject}</DialogTitle>
              <DialogDescription>View message details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {viewMode === 'inbox' ? (
                    <>From: <span className="font-medium text-gray-900 dark:text-white">{selectedMessage.fromDisplayName}</span></>
                  ) : (
                    <>To: <span className="font-medium text-gray-900 dark:text-white">User</span></>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {new Date(selectedMessage.timestamp).toLocaleString()}
                </div>
                {selectedMessage.figureName && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Regarding: <span className="font-medium text-gray-900 dark:text-white">{selectedMessage.figureName}</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDelete(selectedMessage.id)}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>Send a message to another collector</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info banner */}
            {currentUser.role !== 'management' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  You can message collectors you admire or who admire you. Build connections by sending admirer requests!
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="recipient">To:</Label>
              <select
                id="recipient"
                value={composeForm.toUserId}
                onChange={(e) => setComposeForm({ ...composeForm, toUserId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
              >
                <option value="">Select a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} (@{user.username})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  No users available to message. Send admirer requests to connect with other collectors!
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="subject">Subject:</Label>
              <Input
                id="subject"
                placeholder="Message subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="message">Message:</Label>
              <textarea
                id="message"
                placeholder="Type your message here..."
                value={composeForm.message}
                onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendMessage} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button onClick={() => setComposeOpen(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
