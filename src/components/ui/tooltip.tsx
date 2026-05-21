import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

export function TooltipProvider({ children }: TooltipProps) {
  return <>{children}</>;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

interface TooltipContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextProps | undefined>(undefined);

export function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild = false }: TooltipTriggerProps) {
  const context = React.useContext(TooltipContext);

  if (!context) {
    throw new Error('TooltipTrigger must be used within a Tooltip component');
  }

  const { setOpen } = context;

  const handleMouseEnter = () => setOpen(true);
  const handleMouseLeave = () => setOpen(false);
  const handleFocus = () => setOpen(true);
  const handleBlur = () => setOpen(false);

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    });
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function TooltipContent({ children, className = '' }: TooltipContentProps) {
  const context = React.useContext(TooltipContext);

  if (!context) {
    throw new Error('TooltipContent must be used within a Tooltip component');
  }

  const { open } = context;

  if (!open) return null;

  return (
    <div className={`absolute z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white animate-in fade-in-0 zoom-in-95 ${className}`}>
      {children}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
}