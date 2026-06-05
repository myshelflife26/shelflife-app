import { useMemo } from 'react';
import type { ActionFigure } from '../types/index';
import { ReactionsService } from '../utils/reactions';
import { Flame, Heart, ThumbsUp, Eye } from 'lucide-react';

interface TopJealousFiguresProps {
  figures: ActionFigure[];
  userId: string;
  onFigureClick?: (figure: ActionFigure) => void;
}

function TopJealousFigures({ figures, userId, onFigureClick }: TopJealousFiguresProps) {
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

                  {/* Reaction stats */}
                  <div className="flex items-center gap-0.5 text-[10px]">
                    {item.stats.fire > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                        <Flame className="h-2 w-2" />
                        {item.stats.fire}
                      </span>
                    )}
                    {item.stats.love > 0 && (
                      <span className="flex items-center gap-0.5 text-pink-600 dark:text-pink-400">
                        <Heart className="h-2 w-2" />
                        {item.stats.love}
                      </span>
                    )}
                    {item.stats.appreciate > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <ThumbsUp className="h-2 w-2" />
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

export default TopJealousFigures;
