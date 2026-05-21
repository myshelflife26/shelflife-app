import React, { useState, useEffect, useRef, useCallback } from 'react';
import { imageOptimization } from '../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately vs lazy load
  placeholder?: 'blur' | 'empty' | 'skeleton';
  quality?: number;
  sizes?: string; // Responsive sizes attribute
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  quality = 0.85,
  sizes = '100vw',
  onLoad,
  onError,
  onClick,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [placeholderSrc, setPlaceholderSrc] = useState<string>('');
  const [isInView, setIsInView] = useState(priority);

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Generate placeholder
  useEffect(() => {
    if (placeholder !== 'blur' || !src) return;

    const generatePlaceholder = async () => {
      try {
        // Create a tiny, blurred version for progressive loading
        const response = await fetch(src);
        const blob = await response.blob();
        const blurredThumbnail = await imageOptimization.createBlurredThumbnail(blob);
        setPlaceholderSrc(blurredThumbnail);
      } catch (error) {
        console.error('Failed to generate placeholder:', error);
        setPlaceholderSrc('');
      }
    };

    generatePlaceholder();
  }, [src, placeholder]);

  // Load optimized image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const loadOptimizedImage = async () => {
      try {
        // For now, we'll use the original src
        // In a production app, you'd want to serve pre-optimized images
        // or optimize on-the-fly with a service
        setImageSrc(src);
      } catch (error) {
        console.error('Failed to load optimized image:', error);
        setIsError(true);
        onError?.();
      }
    };

    loadOptimizedImage();
  }, [isInView, src, onError]);

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((src: string): string => {
    // In a production app, you would generate these variants
    // For now, we'll use the same source with different size parameters
    const breakpoints = [320, 640, 768, 1024, 1280, 1920];
    const srcSet = breakpoints
      .map((width) => `${src}?w=${width} ${width}w`)
      .join(', ');
    return srcSet;
  }, []);

  // Render skeleton placeholder
  const renderSkeleton = () => (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={`Loading ${alt}`}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 text-gray-400">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
      </div>
    </div>
  );

  // Show error state
  if (isError) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load ${alt}`}
      >
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-3.99z"/>
            </svg>
          </div>
          <span className="text-xs">Failed to load</span>
        </div>
      </div>
    );
  }

  // Show placeholder while loading
  if (!isLoaded) {
    if (placeholder === 'skeleton') {
      return renderSkeleton();
    }

    if (placeholder === 'blur' && placeholderSrc) {
      return (
        <div className="relative">
          <img
            ref={imgRef}
            src={placeholderSrc}
            alt={alt}
            className={`transition-opacity duration-300 filter blur-sm ${className}`}
            style={{ width, height }}
          />
          {imageSrc && (
            <img
              src={imageSrc}
              alt={alt}
              className={`absolute inset-0 transition-opacity duration-300 opacity-0 ${className}`}
              style={{ width, height }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      );
    }

    if (placeholder === 'empty') {
      return (
        <div
          className={`bg-gray-50 dark:bg-gray-900 ${className}`}
          style={{ width, height }}
        />
      );
    }

    return renderSkeleton();
  }

  // Show loaded image
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={`transition-opacity duration-300 ${className}`}
      onLoad={handleImageLoad}
      onError={handleImageError}
      onClick={onClick}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}

// Gallery optimized image for collections
interface GalleryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  className?: string;
}

export function GalleryImage({
  src,
  alt,
  width = 200,
  height = 200,
  onClick,
  className = '',
}: GalleryImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      placeholder="blur"
      quality={0.8}
      onClick={onClick}
    />
  );
}

// Avatar optimized image
interface AvatarImageProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarImage({
  src,
  alt,
  size = 'md',
  className = '',
}: AvatarImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const pixelSize = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={pixelSize[size]}
      height={pixelSize[size]}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      placeholder="skeleton"
      quality={0.85}
      priority={true} // Avatars are usually above fold
    />
  );
}

export default OptimizedImage;