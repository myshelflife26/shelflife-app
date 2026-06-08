import { useMemo } from 'react';
import type { ActionFigure } from '../types/index';
import { ReactionsService } from '../utils/reactions';
import { Flame, Heart, ThumbsUp, Eye } from 'lucide-react';

interface TopJealousFiguresProps {
  figures: ActionFigure[];
  userId: string;
  currentUser?: { id: string; username: string; displayName?: string }; // Add current user for reactions
  onFigureClick?: (figure: ActionFigure) => void;
}

function TopJealousFigures({ figures, userId, currentUser, onFigureClick }: TopJealousFiguresProps) {
  const topJealousFigures = useMemo(() => {
    const figureIds = figures.map(f => f.id);
    const top = ReactionsService.getTopFiguresByJealousy(userId, figureIds, 5);

    return top.map(item => {
      const figure = figures.find(f => f.id === item.figureId);
      return figure ? { ...item, figure } : null;
    }).filter(Boolean) as Array<{
      figureId: string;
      jealousyScore: number;
      stats: { appreciate: number; love: number; fire: number; total: number };
      figure: ActionFigure;
    }>;
  }, [figures, userId]);

  if (topJealousFigures.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 mb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        🔥 Most Jealous Figures
      </h3>

      {/* Horizontal scrolling container for mobile */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-min">
          {topJealousFigures.map(item => {
            const mainImageIndex = item.figure.mainImageIndex ?? 0;
            const imageUrl = item.figure.images?.[mainImageIndex];

            return (
              <div
                key={item.figure.id}
                className="flex-shrink-0 w-16 sm:w-20 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onFigureClick?.(item.figure)}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.figure.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                  {/* Envious Score Badge */}
                  <div className="absolute top-1 right-1 bg-green-600 text-white px-1.5 py-0.5 rounded-full text-xs font-bold shadow flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" />
                    {item.jealousyScore}
                  </div>
                </div>

                {/* Info */}
                <div className="p-1">
                  <h4 className="text-[10px] font-semibold text-gray-900 dark:text-white truncate mb-0.5">
                    {item.figure.name}
                  </h4>

                  {/* Envious Meter - consistent with Browse page */}
                  {(() => {
                    const userReaction = currentUser ? ReactionsService.getUserReaction(item.figureId, currentUser.id) : null;
                    const showBox = item.jealousyScore > 0 || userReaction;

                    if (!showBox) return null;

                    // Determine background color based on user's reaction
                    let bgClass = "bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700";
                    if (userReaction?.reactionType === 'appreciate') {
                      bgClass = "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700/50";
                    } else if (userReaction?.reactionType === 'love') {
                      bgClass = "bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-700/50";
                    } else if (userReaction?.reactionType === 'fire') {
                      bgClass = "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700/50";
                    }

                    return (
                      <div className={`rounded p-1 border ${bgClass}`}>
                        <div className="flex items-center justify-between">
                          {/* Left side: Green eye + score + individual counts */}
                          <div className="flex items-center gap-0.5 text-[9px]">
                            {item.jealousyScore > 0 && (
                              <>
                                <Eye className="h-2 w-2 text-green-500" />
                                <span className="font-semibold text-green-700 dark:text-green-400">
                                  {item.jealousyScore}
                                </span>
                              </>
                            )}
                            {item.stats.fire > 0 && (
                              <>
                                <Flame className="h-2 w-2 text-orange-500 ml-0.5" />
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  {item.stats.fire}
                                </span>
                              </>
                            )}
                            {item.stats.love > 0 && (
                              <>
                                <Heart className="h-2 w-2 text-pink-500 ml-0.5" />
                                <span className="text-pink-600 dark:text-pink-400 font-medium">
                                  {item.stats.love}
                                </span>
                              </>
                            )}
                            {item.stats.appreciate > 0 && (
                              <>
                                <ThumbsUp className="h-2 w-2 text-blue-500 ml-0.5" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {item.stats.appreciate}
                                </span>
                              </>
                            )}
                          </div>
                          {/* Right side: My reaction */}
                          {userReaction && (
                            <div className="flex items-center">
                              {userReaction.reactionType === 'fire' && <Flame className="h-2 w-2 text-orange-600 dark:text-orange-400" />}
                              {userReaction.reactionType === 'love' && <Heart className="h-2 w-2 text-pink-600 dark:text-pink-400" />}
                              {userReaction.reactionType === 'appreciate' && <ThumbsUp className="h-2 w-2 text-blue-600 dark:text-blue-400" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TopJealousFigures;
