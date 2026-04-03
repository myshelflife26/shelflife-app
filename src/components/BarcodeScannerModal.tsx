import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Camera, X, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'barcode-reader';

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);

      const scanner = new Html5Qrcode(readerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          // Support multiple barcode formats
          formatsToSupport: [
            'UPC_A',
            'UPC_E',
            'EAN_13',
            'EAN_8',
            'CODE_128',
            'CODE_39',
          ],
        },
        (decodedText) => {
          // Successfully scanned
          setLastScanned(decodedText);
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // Scanning error (this is normal, happens constantly while scanning)
          // Don't show these to user
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setError(err?.message || 'Failed to access camera. Please check camera permissions.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            Point your camera at a UPC or EAN barcode on the figure's packaging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner viewport */}
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <div id={readerElementId} className="w-full min-h-[300px]" />

            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p>Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Camera Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Make sure your browser has permission to access the camera.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Tips:</strong>
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
              <li>Hold the camera steady and ensure good lighting</li>
              <li>Position the barcode within the scanning area</li>
              <li>Keep the barcode flat and parallel to the camera</li>
              <li>Works with UPC, EAN, and most common barcode formats</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
