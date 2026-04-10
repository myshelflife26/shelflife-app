import { useMemo } from 'react';
import type { ActionFigure } from '../types/index';
import { ReactionsService } from '../utils/reactions';
import { Flame, Heart, ThumbsUp } from 'lucide-react';

interface TopJealousFiguresProps {
  figures: ActionFigure[];
  userId: string;
  onFigureClick?: (figure: ActionFigure) => void;
}

export function TopJealousFigures({ figures, userId, onFigureClick }: TopJealousFiguresProps) {
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
    <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        🔥 Most Jealous Figures
      </h3>

      {/* Horizontal scrolling container for mobile */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 min-w-min">
          {topJealousFigures.map(item => {
            const mainImageIndex = item.figure.mainImageIndex ?? 0;
            const imageUrl = item.figure.images?.[mainImageIndex];

            return (
              <div
                key={item.figure.id}
                className="flex-shrink-0 w-32 sm:w-40 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
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
                      No Image
                    </div>
                  )}
                  {/* Jealousy Score Badge */}
                  <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow">
                    {item.jealousyScore}
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate mb-1">
                    {item.figure.name}
                  </h4>

                  {/* Reaction stats */}
                  <div className="flex items-center gap-2 text-xs">
                    {item.stats.fire > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                        <Flame className="h-3 w-3" />
                        {item.stats.fire}
                      </span>
                    )}
                    {item.stats.love > 0 && (
                      <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400">
                        <Heart className="h-3 w-3" />
                        {item.stats.love}
                      </span>
                    )}
                    {item.stats.appreciate > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <ThumbsUp className="h-3 w-3" />
                        {item.stats.appreciate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
