import { Package } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showTagline = false, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'h-5 w-5',
      text: 'text-lg',
      tagline: 'text-xs',
    },
    md: {
      icon: 'h-6 w-6',
      text: 'text-xl',
      tagline: 'text-sm',
    },
    lg: {
      icon: 'h-8 w-8',
      text: 'text-2xl',
      tagline: 'text-base',
    },
    xl: {
      icon: 'h-12 w-12',
      text: 'text-4xl',
      tagline: 'text-lg',
    },
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Package className={`${sizeClasses[size].icon} text-blue-600 dark:text-blue-400`} />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
      </div>
      <div className="flex flex-col">
        <span className={`${sizeClasses[size].text} font-bold text-gray-900 dark:text-white tracking-tight`}>
          ShelfLife
        </span>
        {showTagline && (
          <span className={`${sizeClasses[size].tagline} text-gray-500 dark:text-gray-400 -mt-1`}>
            Where collections live
          </span>
        )}
      </div>
    </div>
  );
}
