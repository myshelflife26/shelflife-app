import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const TOUR_STORAGE_KEY = 'onboarding-tour-completed';

export function OnboardingTour({ steps, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (!step) return;

    // Find the target element
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible || !step || !targetRect) {
    return null;
  }

  // Calculate popover position
  const getPopoverPosition = () => {
    const placement = step.placement || 'bottom';
    const padding = 16;
    const popoverWidth = 320;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - padding;
        left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - popoverWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        break;
    }

    // Ensure popover stays within viewport
    const maxLeft = window.innerWidth - popoverWidth - 20;
    const minLeft = 20;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    const maxTop = window.innerHeight - 300;
    const minTop = 20;
    top = Math.max(minTop, Math.min(top, maxTop));

    return { top, left };
  };

  const position = getPopoverPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" onClick={handleSkip} />

      {/* Highlight */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          border: '3px solid #3b82f6',
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Popover */}
      <div
        className="fixed z-[10000] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 dark:border-blue-400 p-5"
        style={{
          top: position.top,
          left: position.left,
          width: '320px',
          maxWidth: 'calc(100vw - 40px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step counter */}
        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-6">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : index < currentStep
                  ? 'bg-blue-300 dark:bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleSkip}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Skip Tour
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} size="sm">
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to check if tour should be shown
export function useOnboardingTour(): [boolean, () => void, () => void] {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setShouldShow(!completed);
  }, []);

  const markComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setShouldShow(false);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShouldShow(true);
  };

  return [shouldShow, markComplete, resetTour];
}
