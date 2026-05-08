import { useState, useEffect, useRef } from 'react';
import { FirebaseConversationsService } from '../utils/firebaseConversations';
import type { Conversation, Message, User } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Send, Check, CheckCheck, Clock, Edit2, Trash2, Reply } from 'lucide-react';
import { toastManager } from '../utils/toastManager';

interface ConversationViewProps {
  conversation: Conversation;
  currentUser: User;
  onBack: () => void;
}

export function ConversationView({ conversation, currentUser, onBack }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get other participant(s) info
  const otherParticipants = conversation.participants.filter(p => p !== currentUser.id);
  const otherParticipantName = otherParticipants.length === 1
    ? conversation.participantNames[otherParticipants[0]]
    : `${otherParticipants.length} participants`;

  // Load messages and mark as read
  useEffect(() => {
    loadMessages();
    markAsRead();

    // Subscribe to real-time updates
    const unsubscribe = FirebaseConversationsService.subscribeToConversation(
      conversation.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
        scrollToBottom();
      }
    );

    return () => unsubscribe();
  }, [conversation.id]);

  const loadMessages = async () => {
    const conversationMessages = await FirebaseConversationsService.getMessages(conversation.id);
    setMessages(conversationMessages);
    scrollToBottom();
  };

  const markAsRead = async () => {
    await FirebaseConversationsService.markAsRead(conversation.id, currentUser.id);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await FirebaseConversationsService.sendMessage(
        conversation.id,
        currentUser.id,
        currentUser.displayName,
        newMessage.trim(),
        replyingTo?.id
      );

      setNewMessage('');
      setReplyingTo(null);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      toastManager.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  const isMessageRead = (message: Message) => {
    // Message is read if all other participants have read it
    return otherParticipants.every(participantId => message.readBy.includes(participantId));
  };

  const getReplyToMessage = (messageId: string) => {
    return messages.find(m => m.id === messageId);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {otherParticipantName}
          </h3>
          {conversation.figureName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              About: {conversation.figureName}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.fromUserId === currentUser.id;
            const replyTo = message.replyToMessageId ? getReplyToMessage(message.replyToMessageId) : null;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {/* Sender name (only for other people's messages) */}
                  {!isOwnMessage && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2">
                      {message.fromDisplayName}
                    </span>
                  )}

                  {/* Reply indicator */}
                  {replyTo && (
                    <div className={`text-xs px-3 py-1 rounded ${
                      isOwnMessage
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      <Reply className="h-3 w-3 inline mr-1" />
                      Replying to: {replyTo.message.substring(0, 50)}
                      {replyTo.message.length > 50 ? '...' : ''}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.message}</p>

                    {/* Edited indicator */}
                    {message.edited && (
                      <span className={`text-xs ${isOwnMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {' '}(edited)
                      </span>
                    )}
                  </div>

                  {/* Message footer */}
                  <div className="flex items-center gap-2 px-2">
                    {/* Timestamp */}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>

                    {/* Read receipts (only for own messages) */}
                    {isOwnMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isMessageRead(message) ? (
                          <CheckCheck className="h-3 w-3 text-blue-600" title="Read" />
                        ) : (
                          <Check className="h-3 w-3" title="Sent" />
                        )}
                      </span>
                    )}

                    {/* Reply button */}
                    <button
                      onClick={() => setReplyingTo(message)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      title="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center gap-2">
          <Reply className="h-4 w-4 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Replying to {replyingTo.fromDisplayName}
            </p>
            <p className="text-sm text-gray-900 dark:text-white truncate">
              {replyingTo.message}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyingTo(null)}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="h-11 w-11 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
