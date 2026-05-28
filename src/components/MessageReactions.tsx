import { useState } from 'react';
import { MessageReactionsService, type MessageReactionType, type MessageReaction } from '../utils/messageReactions';
import type { User } from '../types/user';
import { Button } from './ui/button';
import { Smile, Plus } from 'lucide-react';
import { toastManager } from '../utils/toastManager';

interface MessageReactionsProps {
  conversationId: string;
  messageId: string;
  reactions: MessageReaction[];
  currentUser: User;
  className?: string;
}

export function MessageReactions({
  conversationId,
  messageId,
  reactions,
  currentUser,
  className = ''
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const reactionSummary = MessageReactionsService.getReactionSummary(reactions);
  const userReaction = MessageReactionsService.getUserReaction(reactions, currentUser.id);
  const popularReactions = MessageReactionsService.getPopularReactions();

  const handleEmojiClick = async (emoji: MessageReactionType) => {
    if (isReacting) return;

    setIsReacting(true);
    setShowEmojiPicker(false);

    try {
      const action = await MessageReactionsService.toggleReaction(
        conversationId,
        messageId,
        emoji,
        currentUser.id,
        currentUser.displayName
      );

      // Success feedback is implicit (the reaction appears/disappears)
    } catch (error) {
      console.error('Failed to react to message:', error);
      toastManager.error('Failed to add reaction');
    } finally {
      setIsReacting(false);
    }
  };

  const formatReactionTooltip = (emoji: MessageReactionType): string => {
    const summary = reactionSummary[emoji];
    if (!summary || summary.count === 0) return '';

    if (summary.count === 1) {
      return summary.userNames[0];
    }

    if (summary.count === 2) {
      return `${summary.userNames[0]} and ${summary.userNames[1]}`;
    }

    return `${summary.userNames[0]} and ${summary.count - 1} others`;
  };

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {/* Existing reactions */}
      {Object.entries(reactionSummary).map(([emoji, data]) => {
        const emojiType = emoji as MessageReactionType;
        const { symbol } = MessageReactionsService.getEmojiInfo(emojiType);
        const isUserReaction = userReaction === emojiType;

        return (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emojiType)}
            disabled={isReacting}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-colors border
              ${isUserReaction
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            title={formatReactionTooltip(emojiType)}
          >
            <span className="text-sm">{symbol}</span>
            <span className="font-medium">{data.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isReacting}
          className="p-1 h-7 w-7 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          title="Add reaction"
        >
          {showEmojiPicker ? <Plus className="h-3 w-3" /> : <Smile className="h-3 w-3" />}
        </Button>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10">
            <div className="grid grid-cols-3 gap-1">
              {popularReactions.map((emoji) => {
                const { symbol, name } = MessageReactionsService.getEmojiInfo(emoji);
                const isSelected = userReaction === emoji;

                return (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    disabled={isReacting}
                    className={`
                      p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                      ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                    `}
                    title={name}
                  >
                    <span className="text-lg">{symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Click outside handler */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}