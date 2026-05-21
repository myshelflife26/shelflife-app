import React from 'react';

interface SliderProps {
  value: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  id
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onValueChange?.([newValue]);
  };

  const currentValue = value[0] || min;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={`relative flex w-full touch-none select-none items-center ${className}`}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="absolute h-full bg-blue-600 transition-all duration-150 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      />
      <div
        className="absolute block h-5 w-5 rounded-full border-2 border-blue-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-blue-500 dark:bg-gray-950 dark:ring-offset-gray-950"
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
    </div>
  );
}