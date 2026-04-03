import { ReactNode } from 'react';
import { AuthService } from '../utils/auth';

interface ImageOverlayProps {
  children: ReactNode;
  className?: string;
  watermarkText?: string;
  forceWatermark?: boolean; // For testing - force watermark even for premium users
  ownerId?: string; // ID of the user who owns this content
}

/**
 * ImageOverlay component wraps images and adds watermark for free tier users viewing others' content
 * Premium users and content owners see images without watermark
 */
export function ImageOverlay({
  children,
  className = '',
  watermarkText = 'SAMPLE',
  forceWatermark = false,
  ownerId,
}: ImageOverlayProps) {
  const currentUser = AuthService.getCurrentUser();

  // Don't show watermark if:
  // 1. User is premium
  // 2. User owns this content (viewing their own figures)
  // 3. No user is logged in but force watermark is false
  const isPremiumUser = currentUser?.subscriptionTier === 'premium';
  const isOwner = currentUser && ownerId && currentUser.id === ownerId;

  // Show watermark only for free users viewing OTHER users' content
  const showWatermark = forceWatermark ||
    (!isPremiumUser && !isOwner && currentUser !== null);

  if (!showWatermark) {
    // Premium user - return children without watermark
    return <div className={className}>{children}</div>;
  }

  // Free user - add watermark overlay
  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click
      style={{ userSelect: 'none' }} // Prevent text selection
    >
      {children}

      {/* Watermark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(255, 255, 255, 0.05) 100px,
            rgba(255, 255, 255, 0.05) 200px
          )`,
        }}
      >
        {/* Single centered diagonal watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-white font-bold opacity-30 select-none"
            style={{
              fontSize: '3rem',
              transform: 'rotate(-45deg)',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.5rem',
            }}
          >
            {watermarkText}
          </div>
        </div>
      </div>

      {/* Upgrade badge (optional) */}
      <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg opacity-80 pointer-events-none">
        Premium for no watermark
      </div>
    </div>
  );
}

/**
 * Simple wrapper for img tags with watermark
 */
export function WatermarkedImage({
  src,
  alt,
  className = '',
  watermarkText,
  forceWatermark,
  ownerId,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  watermarkText?: string;
  forceWatermark?: boolean;
  ownerId?: string;
  [key: string]: any;
}) {
  return (
    <ImageOverlay
      className={className}
      watermarkText={watermarkText}
      forceWatermark={forceWatermark}
      ownerId={ownerId}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        {...props}
      />
    </ImageOverlay>
  );
}
