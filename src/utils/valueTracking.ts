import type { ValueSnapshot } from '../types/index';

const STORAGE_KEY = 'value-snapshots';
const SNAPSHOT_RETENTION_DAYS = 90;

export class ValueTrackingService {
  // Get all snapshots for a user
  private static getSnapshots(userId: string): ValueSnapshot[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading value snapshots:', error);
      return [];
    }
  }

  // Save snapshots for a user
  private static saveSnapshots(userId: string, snapshots: ValueSnapshot[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(snapshots));
    } catch (error) {
      console.error('Error saving value snapshots:', error);
    }
  }

  // Clean up old snapshots (older than retention period)
  private static cleanupOldSnapshots(userId: string): void {
    const snapshots = this.getSnapshots(userId);
    const cutoffTime = Date.now() - (SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filtered = snapshots.filter(s => s.timestamp > cutoffTime);
    this.saveSnapshots(userId, filtered);
  }

  // Record a new snapshot
  static recordSnapshot(
    userId: string,
    totalValue: number,
    figureCount: number
  ): void {
    this.cleanupOldSnapshots(userId);
    const snapshots = this.getSnapshots(userId);
    const now = Date.now();

    // Check if we already have a snapshot from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    const hasTodaySnapshot = snapshots.some(s => s.timestamp >= todayStartTime);

    // Only record one snapshot per day
    if (!hasTodaySnapshot) {
      const averageValue = figureCount > 0 ? totalValue / figureCount : 0;

      snapshots.push({
        timestamp: now,
        totalValue,
        figureCount,
        averageValue,
      });

      this.saveSnapshots(userId, snapshots);
    }
  }

  // Get value history for a user
  static getValueHistory(userId: string): ValueSnapshot[] {
    const snapshots = this.getSnapshots(userId);
    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get trend direction (up, down, stable)
  static getTrendDirection(userId: string): 'up' | 'down' | 'stable' | 'insufficient-data' {
    const snapshots = this.getSnapshots(userId);

    if (snapshots.length < 2) {
      return 'insufficient-data';
    }

    // Sort by timestamp
    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

    // Compare most recent to oldest
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];

    const change = newest.totalValue - oldest.totalValue;
    const percentChange = (change / oldest.totalValue) * 100;

    // Consider stable if less than 1% change
    if (Math.abs(percentChange) < 1) {
      return 'stable';
    }

    return change > 0 ? 'up' : 'down';
  }

  // Get value change over period
  static getValueChange(userId: string, daysAgo: number): {
    absolute: number;
    percentage: number;
    previousValue: number;
    currentValue: number;
  } | null {
    const snapshots = this.getSnapshots(userId);

    if (snapshots.length === 0) {
      return null;
    }

    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
    const newest = sorted[sorted.length - 1];

    // Find snapshot closest to daysAgo
    const targetTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    let closestSnapshot = sorted[0];
    let minDiff = Math.abs(closestSnapshot.timestamp - targetTime);

    for (const snapshot of sorted) {
      const diff = Math.abs(snapshot.timestamp - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnapshot = snapshot;
      }
    }

    const absolute = newest.totalValue - closestSnapshot.totalValue;
    const percentage = closestSnapshot.totalValue > 0
      ? (absolute / closestSnapshot.totalValue) * 100
      : 0;

    return {
      absolute,
      percentage,
      previousValue: closestSnapshot.totalValue,
      currentValue: newest.totalValue,
    };
  }

  // Get average value over period
  static getAverageValue(userId: string, daysAgo?: number): number | null {
    const snapshots = this.getSnapshots(userId);

    if (snapshots.length === 0) {
      return null;
    }

    let relevantSnapshots = snapshots;

    if (daysAgo) {
      const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
      relevantSnapshots = snapshots.filter(s => s.timestamp >= cutoffTime);
    }

    if (relevantSnapshots.length === 0) {
      return null;
    }

    const sum = relevantSnapshots.reduce((acc, s) => acc + s.totalValue, 0);
    return sum / relevantSnapshots.length;
  }

  // Get most recent snapshot
  static getLatestSnapshot(userId: string): ValueSnapshot | null {
    const snapshots = this.getSnapshots(userId);

    if (snapshots.length === 0) {
      return null;
    }

    return snapshots.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  // Check if user has enough data for trends
  static hasEnoughData(userId: string, minimumSnapshots: number = 2): boolean {
    const snapshots = this.getSnapshots(userId);
    return snapshots.length >= minimumSnapshots;
  }

  // Get data points for chart (for last N days)
  static getChartData(userId: string, daysToShow?: number): Array<{
    timestamp: number;
    totalValue: number;
    figureCount: number;
    averageValue: number;
  }> {
    let snapshots = this.getSnapshots(userId);

    if (daysToShow) {
      const cutoffTime = Date.now() - (daysToShow * 24 * 60 * 60 * 1000);
      snapshots = snapshots.filter(s => s.timestamp >= cutoffTime);
    }

    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Clear all snapshots for a user (for testing/reset)
  static clearSnapshots(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
  }
}
