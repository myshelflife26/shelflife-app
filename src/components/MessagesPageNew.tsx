import { useState, useEffect } from 'react';
import { FirebaseConversationsService } from '../utils/firebaseConversations';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { AdmirersService } from '../utils/admirers';
import type { Conversation, User } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { MessageCircle, Search, PenSquare, Archive, Mail, MailOpen, Clock, Info, Send } from 'lucide-react';
import { toastManager } from '../utils/toastManager';
import { ConversationView } from './ConversationView';

interface MessagesPageProps {
  currentUser: User;
}

type FilterMode = 'all' | 'unread' | 'archived';

export function MessagesPageNew({ currentUser }: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [composeForm, setComposeForm] = useState({
    toUserId: '',
    message: '',
    figureId: '',
    figureName: ''
  });
  const [loading, setLoading] = useState(true);

  // Load conversations
  useEffect(() => {
    loadConversations();
    loadUnreadCount();

    // Subscribe to real-time updates
    const unsubscribe = FirebaseConversationsService.subscribeToUserConversations(
      currentUser.id,
      (updatedConversations) => {
        setConversations(updatedConversations);
        updateUnreadCount(updatedConversations);
      }
    );

    return () => unsubscribe();
  }, [currentUser.id]);

  // Reload conversations when filter mode changes
  useEffect(() => {
    loadConversations();
  }, [filterMode]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const includeArchived = filterMode === 'archived';
      const userConversations = await FirebaseConversationsService.getUserConversations(
        currentUser.id,
        includeArchived
      );
      setConversations(userConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    const count = await FirebaseConversationsService.getTotalUnreadCount(currentUser.id);
    setTotalUnreadCount(count);
  };

  const updateUnreadCount = (convs: Conversation[]) => {
    const count = convs.reduce((total, conv) => total + (conv.unreadCount[currentUser.id] || 0), 0);
    setTotalUnreadCount(count);
  };

  // Filter conversations based on mode and search
  const filteredConversations = conversations.filter(conv => {
    // Apply filter mode
    if (filterMode === 'unread' && (conv.unreadCount[currentUser.id] || 0) === 0) {
      return false;
    }
    if (filterMode === 'archived' && !conv.archived?.[currentUser.id]) {
      return false;
    }
    if (filterMode === 'all' && conv.archived?.[currentUser.id]) {
      return false;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      const participantNamesMatch = Object.values(conv.participantNames).some(name =>
        name.toLowerCase().includes(lowerQuery)
      );
      const lastMessageMatch = conv.lastMessage.toLowerCase().includes(lowerQuery);
      const figureNameMatch = conv.figureName?.toLowerCase().includes(lowerQuery);

      return participantNamesMatch || lastMessageMatch || figureNameMatch;
    }

    return true;
  });

  // Get available users to message
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

    // Paid users can message users they admire or who admire them
    const availableUsers: User[] = [];
    for (const user of allUsers) {
      const isAdmiring = await AdmirersService.isAdmirer(user.id, currentUser.id);
      const isAdmirer = await AdmirersService.isAdmirer(currentUser.id, user.id);
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
      message: '',
      figureId: '',
      figureName: ''
    });

    // Load available users
    const users = await getAvailableUsers();
    setAvailableUsers(users);
    setComposeOpen(true);
  };

  // Handle start new conversation
  const handleStartConversation = async () => {
    if (!composeForm.toUserId || !composeForm.message) {
      toastManager.warning('Please select a recipient and write a message');
      return;
    }

    try {
      const toUser = availableUsers.find(u => u.id === composeForm.toUserId);
      if (!toUser) {
        toastManager.error('Invalid recipient');
        return;
      }

      // Create or get conversation
      const conversationId = await FirebaseConversationsService.createOrGetConversation(
        [currentUser.id, composeForm.toUserId],
        {
          [currentUser.id]: currentUser.displayName,
          [composeForm.toUserId]: toUser.displayName
        },
        composeForm.figureId || undefined,
        composeForm.figureName || undefined
      );

      // Send first message
      await FirebaseConversationsService.sendMessage(
        conversationId,
        currentUser.id,
        currentUser.displayName,
        composeForm.message
      );

      toastManager.success(`Message sent to ${toUser.displayName}`);
      setComposeOpen(false);

      // Reload conversations and open the new one
      await loadConversations();
      const newConversation = await FirebaseConversationsService.getConversation(conversationId);
      if (newConversation) {
        setSelectedConversation(newConversation);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toastManager.error('Failed to send message');
    }
  };

  // Handle conversation selection
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mark as read will be handled by ConversationView
  };

  // Handle archive toggle
  const handleToggleArchive = async (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const isArchived = conversation.archived?.[currentUser.id] || false;
    await FirebaseConversationsService.toggleArchive(conversation.id, currentUser.id, !isArchived);
    loadConversations();
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

  // Get other participant name
  const getOtherParticipantName = (conversation: Conversation) => {
    const otherParticipants = conversation.participants.filter(p => p !== currentUser.id);
    if (otherParticipants.length === 1) {
      return conversation.participantNames[otherParticipants[0]];
    }
    return `${otherParticipants.length} participants`;
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row">
        {/* Conversations List - Left Side */}
        <div className={`w-full lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${
          selectedConversation ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Messages
            </h2>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-3">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
              >
                All
              </Button>
              <Button
                variant={filterMode === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('unread')}
              >
                Unread
                {totalUnreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </Button>
              <Button
                variant={filterMode === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('archived')}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Compose Button */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleCompose}
              className="w-full"
              title={currentUser.subscriptionTier === 'free' ? 'Upgrade to send messages' : 'Start a new conversation'}
            >
              <PenSquare className="h-4 w-4 mr-2" />
              New Message
              {currentUser.subscriptionTier === 'free' && (
                <span className="ml-1 text-xs">(Upgrade)</span>
              )}
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations.map((conversation) => {
                  const unreadCount = conversation.unreadCount[currentUser.id] || 0;
                  const isUnread = unreadCount > 0;
                  const otherParticipantName = getOtherParticipantName(conversation);

                  return (
                    <div
                      key={conversation.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                        isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      } ${
                        selectedConversation?.id === conversation.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isUnread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {otherParticipantName}
                            </h3>
                          </div>

                          {conversation.figureName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              About: {conversation.figureName}
                            </p>
                          )}

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {conversation.lastMessage || 'No messages yet'}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(conversation.lastMessageTimestamp)}
                          </div>

                          {unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => handleToggleArchive(conversation, e)}
                            title={conversation.archived?.[currentUser.id] ? 'Unarchive' : 'Archive'}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Conversation View - Right Side */}
        <div className={`flex-1 ${selectedConversation ? 'block' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
              currentUser={currentUser}
              onBack={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="text-center p-8">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Start a new conversation</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <Label htmlFor="recipient">To</Label>
              <select
                id="recipient"
                value={composeForm.toUserId}
                onChange={(e) => setComposeForm(prev => ({ ...prev, toUserId: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Select recipient...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} (@{user.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={composeForm.message}
                onChange={(e) => setComposeForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your message..."
                rows={5}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartConversation}
                disabled={!composeForm.toUserId || !composeForm.message}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
