import React, { useState, useEffect } from 'react';
import { Settings, Image, Zap, HardDrive, Gauge, Info, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { ImageOptimizationOptions } from '../utils/imageOptimization';
import { offlineCapabilities } from '../utils/offlineCapabilities';

interface ImageOptimizationSettingsProps {
  onSettingsChange?: (settings: ImageOptimizationOptions) => void;
}

export function ImageOptimizationSettings({
  onSettingsChange,
}: ImageOptimizationSettingsProps) {
  const [settings, setSettings] = useState<ImageOptimizationOptions>({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'auto',
    maintainAspectRatio: true,
    enableProgressive: true,
  });

  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    totalFiles: number;
    totalSavings: number;
    averageCompression: number;
  } | null>(null);

  // Load storage information
  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 0;
          const percentage = quota > 0 ? (usage / quota) * 100 : 0;

          setStorageInfo({
            usage,
            quota,
            percentage,
          });
        }
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    };

    loadStorageInfo();
  }, []);

  const handleSettingChange = (key: keyof ImageOptimizationOptions, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    // Save to localStorage
    localStorage.setItem('shelflife_image_optimization_settings', JSON.stringify(newSettings));
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shelflife_image_optimization_settings');
      if (saved) {
        const savedSettings = JSON.parse(saved);
        setSettings(savedSettings);
        onSettingsChange?.(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load optimization settings:', error);
    }
  }, [onSettingsChange]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getQualityLabel = (quality: number): string => {
    if (quality >= 90) return 'Maximum';
    if (quality >= 80) return 'High';
    if (quality >= 70) return 'Medium';
    if (quality >= 60) return 'Low';
    return 'Minimum';
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case 'auto':
        return 'Automatically choose the best format (AVIF > WebP > JPEG)';
      case 'webp':
        return 'WebP format - Good compression with wide browser support';
      case 'jpeg':
        return 'JPEG format - Universal compatibility';
      case 'png':
        return 'PNG format - Lossless compression, larger file sizes';
      default:
        return '';
    }
  };

  const estimateCompressionRatio = (): number => {
    const baseRatio = settings.format === 'webp' ? 0.7 : settings.format === 'jpeg' ? 0.8 : 0.6;
    const qualityFactor = (settings.quality || 85) / 100;
    return baseRatio * qualityFactor;
  };

  const clearCache = async () => {
    try {
      await offlineCapabilities.clearAllCaches();
      // Refresh storage info
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageInfo({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
        });
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Quality Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Image className="h-5 w-5 mr-2" />
            Image Quality & Compression
          </CardTitle>
          <CardDescription>
            Configure how images are optimized when uploaded to your collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quality Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="quality">
                Image Quality
              </Label>
              <Badge variant="outline">
                {settings.quality}% - {getQualityLabel(settings.quality || 85)}
              </Badge>
            </div>
            <Slider
              id="quality"
              min={10}
              max={100}
              step={5}
              value={[settings.quality || 85]}
              onValueChange={([value]) => handleSettingChange('quality', value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Higher quality means larger file sizes. 85% is recommended for most images.
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label htmlFor="format">Output Format</Label>
            <Select
              value={settings.format || 'auto'}
              onValueChange={(value) => handleSettingChange('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {getFormatDescription(settings.format || 'auto')}
            </p>
          </div>

          {/* Dimension Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWidth">Max Width (px)</Label>
              <Select
                value={settings.maxWidth?.toString() || '1920'}
                onValueChange={(value) => handleSettingChange('maxWidth', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1280">1280px (720p)</SelectItem>
                  <SelectItem value="1920">1920px (1080p)</SelectItem>
                  <SelectItem value="2560">2560px (1440p)</SelectItem>
                  <SelectItem value="3840">3840px (4K)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxHeight">Max Height (px)</Label>
              <Select
                value={settings.maxHeight?.toString() || '1080'}
                onValueChange={(value) => handleSettingChange('maxHeight', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720">720px</SelectItem>
                  <SelectItem value="1080">1080px</SelectItem>
                  <SelectItem value="1440">1440px</SelectItem>
                  <SelectItem value="2160">2160px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintain Aspect Ratio</Label>
                <p className="text-sm text-gray-500">
                  Keep original proportions when resizing
                </p>
              </div>
              <Switch
                checked={settings.maintainAspectRatio ?? true}
                onCheckedChange={(checked) => handleSettingChange('maintainAspectRatio', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Progressive Loading</Label>
                <p className="text-sm text-gray-500">
                  Enable progressive JPEG encoding
                </p>
              </div>
              <Switch
                checked={settings.enableProgressive ?? true}
                onCheckedChange={(checked) => handleSettingChange('enableProgressive', checked)}
              />
            </div>
          </div>

          {/* Compression Estimate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                Estimated Compression
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              With these settings, images will be approximately{' '}
              <strong>{Math.round((1 - estimateCompressionRatio()) * 100)}%</strong> smaller
              than the original.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Storage Information */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              Storage Usage
            </CardTitle>
            <CardDescription>
              Browser storage usage and cache information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Used Storage</span>
                <span className="text-sm text-gray-500">
                  {formatBytes(storageInfo.usage)} of {formatBytes(storageInfo.quota)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {storageInfo.percentage.toFixed(1)}% of available storage used
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCache}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Image Cache
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Clears cached images to free up storage space
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gauge className="h-5 w-5 mr-2" />
            Performance Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Use Auto format selection</p>
                <p className="text-xs text-gray-500">
                  Automatically chooses the best format supported by your browser
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Keep quality at 80-90%</p>
                <p className="text-xs text-gray-500">
                  Optimal balance between file size and visual quality
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Resize large images</p>
                <p className="text-xs text-gray-500">
                  Images larger than 1920px are rarely needed for web viewing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ImageOptimizationSettings;