import { useState, useEffect } from 'react';
import type { ActionFigure } from '../types/index';
import { ReactionsService } from '../utils/reactions';
import { Button } from './ui/button';
import { X, Flame, Heart, ThumbsUp, ExternalLink, ChevronLeft, ChevronRight, ShieldOff, Flag, Eye, EyeOff, Lock } from 'lucide-react';
import { WatermarkedImage } from './ImageOverlay';
import { CompletenessBadge } from './CompletenessBadge';
import { AdmirersService } from '../utils/admirers';
import { UserRatingBadge } from './UserRatingBadge';
import { CommentsSection } from './CommentsSection';
import { FirebaseNotifications } from '../utils/firebaseNotifications';
import type { User } from '../types/user';

interface FigureDetailModalProps {
  figure: ActionFigure & { ownerName: string; ownerDisplayName: string; ownerUsername: string };
  currentUserId: string;
  currentUser?: User; // Optional for backwards compatibility
  onClose: () => void;
  onViewOwnerCollection: (ownerId: string) => void;
  onReactionChange?: () => void;
  onBlockUser?: (userId: string, username: string) => void;
  onReportUser?: (userId: string, username: string) => void;
  onFigureUpdate?: (figureId: string, updates: Partial<ActionFigure>) => void;
}

export function FigureDetailModal({
  figure,
  currentUserId,
  currentUser,
  onClose,
  onViewOwnerCollection,
  onReactionChange,
  onBlockUser,
  onReportUser,
  onFigureUpdate
}: FigureDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(figure.mainImageIndex ?? 0);
  const [reactionKey, setReactionKey] = useState(0); // Key to force re-render
  const [isAdmirer, setIsAdmirer] = useState(false);
  const [customFormulaAccessRequested, setCustomFormulaAccessRequested] = useState(false);
  const images = figure.images || [];
  const hasMultipleImages = images.length > 1;

  // Check if current user is an admirer of this figure's owner
  useEffect(() => {
    const checkAdmirerStatus = async () => {
      if (figure.userId && currentUserId !== figure.userId) {
        const admirer = await AdmirersService.isAdmirer(figure.userId, currentUserId);
        setIsAdmirer(admirer);
      }
    };
    checkAdmirerStatus();
  }, [figure.userId, currentUserId]);

  const jealousyScore = ReactionsService.getJealousyScore(figure.id, figure.userId!);
  const stats = ReactionsService.getJealousyStats(figure.id, figure.userId!);

  const hasReacted = (type: 'fire' | 'love' | 'appreciate'): boolean => {
    return ReactionsService.hasReacted(figure.id, figure.userId!, currentUserId, type);
  };

  const handleReaction = (type: 'fire' | 'love' | 'appreciate') => {
    ReactionsService.toggleReaction(figure.id, figure.userId!, currentUserId, type);
    // Force re-render of this modal
    setReactionKey(prev => prev + 1);
    // Notify parent to refresh feed data
    if (onReactionChange) {
      onReactionChange();
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {figure.name}
              {figure.version && (
                <span className="ml-2 text-base font-semibold text-blue-600 dark:text-blue-400">
                  {figure.version}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Owned by {figure.ownerDisplayName}
            </p>
            {figure.userId && (
              <UserRatingBadge userId={figure.userId} size="md" />
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Section */}
            <div>
              {images.length > 0 ? (
                <div className="relative">
                  <div className="relative h-96 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <WatermarkedImage
                      src={images[currentImageIndex]}
                      alt={`${figure.name} - Image ${currentImageIndex + 1}`}
                      watermarkText="SAMPLE"
                      ownerId={figure.userId}
                      className="w-full h-full object-contain"
                    />
                    {currentImageIndex === (figure.mainImageIndex ?? 0) && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Main Image
                      </div>
                    )}
                  </div>

                  {/* Image navigation */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={handlePreviousImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}

                  {/* Thumbnails */}
                  {hasMultipleImages && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                            idx === currentImageIndex
                              ? 'border-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">No images available</p>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div key={reactionKey} className="space-y-4">
              {/* Jealousy Score */}
              {jealousyScore > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Jealousy Score</p>
                    <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {jealousyScore}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    {stats.fire > 0 && (
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <Flame className="h-4 w-4" /> {stats.fire}
                      </span>
                    )}
                    {stats.love > 0 && (
                      <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                        <Heart className="h-4 w-4" /> {stats.love}
                      </span>
                    )}
                    {stats.appreciate > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <ThumbsUp className="h-4 w-4" /> {stats.appreciate}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* React Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={hasReacted('fire') ? 'default' : 'outline'}
                  onClick={() => handleReaction('fire')}
                  className="w-full"
                >
                  <Flame className="h-4 w-4 mr-2" />
                  Fire
                </Button>
                <Button
                  variant={hasReacted('love') ? 'default' : 'outline'}
                  onClick={() => handleReaction('love')}
                  className="w-full"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Love
                </Button>
                <Button
                  variant={hasReacted('appreciate') ? 'default' : 'outline'}
                  onClick={() => handleReaction('appreciate')}
                  className="w-full"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Like
                </Button>
              </div>

              {/* Figure Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                {figure.manufacturer && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{figure.manufacturer}</span>
                  </div>
                )}
                {figure.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{figure.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Condition:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{figure.condition}</span>
                </div>
                {figure.size && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Size:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{figure.size}</span>
                  </div>
                )}
                {figure.packaging && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Packaging:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{figure.packaging}</span>
                  </div>
                )}
                {figure.condition === 'Loose' && figure.completenessPercentage !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Completeness:</span>
                    <CompletenessBadge
                      percentage={figure.completenessPercentage}
                      size="sm"
                      condition={figure.condition}
                    />
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Value:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${figure.currentValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Accessories List */}
              {figure.accessories && figure.accessories.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Accessories</h4>
                  <div className="space-y-1">
                    {figure.accessories.map((accessory, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${accessory.owned ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className={accessory.owned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 line-through'}>
                          {accessory.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Formula (with privacy) */}
              {figure.condition === 'Custom' && figure.customFormula && (() => {
                const isOwner = figure.userId === currentUserId;
                const privacy = figure.customFormulaPrivacy || 'private';
                const canView = isOwner ||
                               privacy === 'public' ||
                               (privacy === 'admirers-only' && isAdmirer);

                return (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">Custom Build Details</h4>
                      {!isOwner && (
                        <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300">
                          {privacy === 'private' && <Lock className="h-3 w-3" />}
                          {privacy === 'admirers-only' && <Eye className="h-3 w-3" />}
                          {privacy === 'public' && <Eye className="h-3 w-3" />}
                          <span className="capitalize">{privacy.replace('-', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {canView ? (
                      <div className="space-y-1 text-sm text-purple-900 dark:text-purple-100">
                        {figure.customFormula.head && <div><strong>Head:</strong> {figure.customFormula.head}</div>}
                        {figure.customFormula.torso && <div><strong>Torso:</strong> {figure.customFormula.torso}</div>}
                        {figure.customFormula.waist && <div><strong>Waist:</strong> {figure.customFormula.waist}</div>}
                        {figure.customFormula.rightArm && <div><strong>Right Arm:</strong> {figure.customFormula.rightArm}</div>}
                        {figure.customFormula.leftArm && <div><strong>Left Arm:</strong> {figure.customFormula.leftArm}</div>}
                        {figure.customFormula.rightLeg && <div><strong>Right Leg:</strong> {figure.customFormula.rightLeg}</div>}
                        {figure.customFormula.leftLeg && <div><strong>Left Leg:</strong> {figure.customFormula.leftLeg}</div>}
                        {figure.customFormula.accessories && <div><strong>Accessories:</strong> {figure.customFormula.accessories}</div>}
                        {figure.customFormula.other && <div><strong>Other:</strong> {figure.customFormula.other}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-purple-700 dark:text-purple-300">
                        <div className="flex items-center gap-2 mb-2">
                          <EyeOff className="h-4 w-4" />
                          <span>Build details are {privacy === 'admirers-only' ? 'only visible to admirers' : 'private'}</span>
                        </div>
                        {!customFormulaAccessRequested ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-300 dark:border-purple-700"
                            onClick={async () => {
                              if (!currentUser) return;

                              try {
                                await FirebaseNotifications.createFormulaAccessRequestNotification(
                                  figure.userId,
                                  figure.id,
                                  figure.name,
                                  figure.images?.[0],
                                  currentUser.id,
                                  currentUser.displayName,
                                  currentUser.username
                                );
                                setCustomFormulaAccessRequested(true);
                              } catch (error) {
                                console.error('Failed to send access request:', error);
                                alert('Failed to send request. Please try again.');
                              }
                            }}
                          >
                            Request Access
                          </Button>
                        ) : (
                          <p className="text-xs italic">Access request pending...</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* View Collection and Action Buttons */}
              {figure.userId !== currentUserId && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      onClose();
                      onViewOwnerCollection(figure.userId!);
                    }}
                    className="flex-1"
                    variant="outline"
                    title={`View ${figure.ownerDisplayName}'s Collection`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Collection
                  </Button>

                  {onReportUser && (
                    <Button
                      onClick={() => {
                        onClose();
                        onReportUser(figure.userId!, figure.ownerDisplayName);
                      }}
                      variant="outline"
                      size="icon"
                      className="border-orange-200 dark:border-orange-800 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                      title="Report User"
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  )}

                  {onBlockUser && (
                    <Button
                      onClick={() => {
                        onClose();
                        onBlockUser(figure.userId!, figure.ownerDisplayName);
                      }}
                      variant="outline"
                      size="icon"
                      className="border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Block User"
                    >
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          {currentUser && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <CommentsSection
                figureId={figure.id}
                currentUser={currentUser}
                figureOwnerId={figure.userId!}
                figure={figure}
                onFigureUpdate={(updates) => onFigureUpdate?.(figure.id, updates)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
