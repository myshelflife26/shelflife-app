import { useState, useRef, useEffect } from 'react';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Move, RotateCcw } from 'lucide-react';

interface ImagePositionAdjusterProps {
  imageUrl: string;
  position: string;
  onPositionChange: (position: string) => void;
}

export function ImagePositionAdjuster({ imageUrl, position, onPositionChange }: ImagePositionAdjusterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false); // Use ref for immediate updates

  // Parse current position to x/y percentages
  const parsePosition = (pos: string): { x: number; y: number } => {
    const parts = pos.split(' ');
    let x = 50, y = 50;

    if (parts[0] === 'left') x = 0;
    else if (parts[0] === 'right') x = 100;
    else if (parts[0] === 'center') x = 50;
    else if (parts[0].endsWith('%')) x = parseFloat(parts[0]);

    if (parts[1] === 'top') y = 0;
    else if (parts[1] === 'bottom') y = 100;
    else if (parts[1] === 'center') y = 50;
    else if (parts[1]?.endsWith('%')) y = parseFloat(parts[1]);

    return { x, y };
  };

  const [posPercent, setPosPercent] = useState(parsePosition(position));

  useEffect(() => {
    setPosPercent(parsePosition(position));
  }, [position]);

  // Load image to get natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Calculate position relative to container
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Convert to percentage (0-100)
    const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100));

    setPosPercent({ x: xPercent, y: yPercent });
    onPositionChange(`${xPercent.toFixed(1)}% ${yPercent.toFixed(1)}%`);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    // Capture pointer to ensure we get all move events
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }

    // Set initial position on mousedown
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);

    // Release pointer capture
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Allow clicking to set position (fallback for dragging issues)
    if (isDraggingRef.current) return; // Don't trigger on drag end
    updatePosition(e.clientX, e.clientY);
  };

  const handleReset = () => {
    setPosPercent({ x: 50, y: 50 });
    onPositionChange('center center');
  };

  // Cleanup ref when component unmounts
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
    };
  }, []);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Label className="flex items-center gap-2">
            <Move className="h-4 w-4" />
            Adjust Main Image Position
          </Label>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Drag the crosshair, click to set position, or use the buttons below
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReset}
          title="Reset to center"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Interactive Preview */}
      <div
        ref={containerRef}
        className={`relative w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 ${
          isDragging ? 'border-blue-500 cursor-grabbing' : 'border-gray-300 dark:border-gray-600 cursor-grab'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        style={{ touchAction: 'none' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Position preview"
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{ objectPosition: `${posPercent.x}% ${posPercent.y}%` }}
          draggable={false}
        />

        {/* Crosshair indicator */}
        <div
          className="absolute w-6 h-6 pointer-events-none"
          style={{
            left: `${posPercent.x}%`,
            top: `${posPercent.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="absolute inset-0 border-2 border-white rounded-full shadow-lg"></div>
          <div className="absolute inset-0.5 border-2 border-blue-500 rounded-full"></div>
          {/* Horizontal line */}
          <div className="absolute top-1/2 left-1/2 w-screen h-0.5 bg-blue-500/30 -translate-x-1/2 -translate-y-1/2"></div>
          {/* Vertical line */}
          <div className="absolute top-1/2 left-1/2 h-screen w-0.5 bg-blue-500/30 -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Help text overlay when not dragging */}
        {!isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Move className="h-4 w-4" />
                Click to position
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick position buttons */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setPosPercent({ x: 50, y: 0 });
            onPositionChange('center top');
          }}
        >
          Top
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setPosPercent({ x: 50, y: 50 });
            onPositionChange('center center');
          }}
        >
          Center
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setPosPercent({ x: 50, y: 100 });
            onPositionChange('center bottom');
          }}
        >
          Bottom
        </Button>
      </div>

      {/* Current position display */}
      <div className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
        Position: {posPercent.x.toFixed(0)}% horizontal, {posPercent.y.toFixed(0)}% vertical
      </div>
    </div>
  );
}
