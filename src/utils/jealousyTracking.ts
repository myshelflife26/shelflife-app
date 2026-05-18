import { ReactionsService } from './reactions';

interface JealousySnapshot {
  figureId: string;
  ownerId: string;
  score: number;
  timestamp: number;
}

const STORAGE_KEY = 'jealousy-snapshots';
const SNAPSHOT_RETENTION_DAYS = 365;

export class JealousyTrackingService {
  // Get all snapshots
  private static getSnapshots(): JealousySnapshot[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading jealousy snapshots:', error);
      return [];
    }
  }

  // Save snapshots
  private static saveSnapshots(snapshots: JealousySnapshot[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    } catch (error) {
      console.error('Error saving jealousy snapshots:', error);
    }
  }

  // Clean up old snapshots (older than retention period)
  private static cleanupOldSnapshots(): void {
    const snapshots = this.getSnapshots();
    const cutoffTime = Date.now() - (SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filtered = snapshots.filter(s => s.timestamp > cutoffTime);
    this.saveSnapshots(filtered);
  }

  // Record current scores for all public figures
  static recordSnapshots(publicFigures: Array<{ id: string; userId: string }>): void {
    this.cleanupOldSnapshots();
    const snapshots = this.getSnapshots();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    publicFigures.forEach(figure => {
      const score = ReactionsService.getJealousyScore(figure.id, figure.userId);

      // Only record if score > 0
      if (score > 0) {
        // Check if we already have a recent snapshot (within last 24 hours) for this figure
        const hasRecentSnapshot = snapshots.some(s =>
          s.figureId === figure.id &&
          s.ownerId === figure.userId &&
          s.timestamp > oneDayAgo
        );

        // Only record if no recent snapshot exists
        if (!hasRecentSnapshot) {
          snapshots.push({
            figureId: figure.id,
            ownerId: figure.userId,
            score,
            timestamp: now
          });
        }
      }
    });

    this.saveSnapshots(snapshots);
  }

  // Get figures with biggest jealousy increases
  static getRisingStars(
    currentFigures: Array<{ id: string; userId: string }>,
    limit: number = 10,
    daysBack: number = 7
  ): Array<{
    figureId: string;
    ownerId: string;
    currentScore: number;
    previousScore: number;
    increase: number;
  }> {
    const snapshots = this.getSnapshots();
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const rises: Array<{
      figureId: string;
      ownerId: string;
      currentScore: number;
      previousScore: number;
      increase: number;
    }> = [];

    currentFigures.forEach(figure => {
      const currentScore = ReactionsService.getJealousyScore(figure.id, figure.userId);

      if (currentScore === 0) return;

      // Find oldest snapshot for this figure within the specified time period
      const figureSnapshots = snapshots
        .filter(s =>
          s.figureId === figure.id &&
          s.ownerId === figure.userId &&
          s.timestamp >= cutoffTime
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      if (figureSnapshots.length === 0) {
        // No history in this time period
        // Check if figure has ANY historical snapshots at all
        const anySnapshots = snapshots.filter(s =>
          s.figureId === figure.id &&
          s.ownerId === figure.userId
        );

        if (anySnapshots.length > 0) {
          // Has history in a different time period, skip this figure
          // (it didn't have activity in the selected period)
          return;
        } else {
          // No history at all - treat as new figure with full score as increase
          // This helps populate the list while historical data builds up
          rises.push({
            figureId: figure.id,
            ownerId: figure.userId,
            currentScore,
            previousScore: 0,
            increase: currentScore
          });
        }
      } else {
        // Use oldest snapshot as baseline
        const oldestSnapshot = figureSnapshots[0];
        const increase = currentScore - oldestSnapshot.score;

        if (increase > 0) {
          rises.push({
            figureId: figure.id,
            ownerId: figure.userId,
            currentScore,
            previousScore: oldestSnapshot.score,
            increase
          });
        }
      }
    });

    // Sort by increase (descending) and take top N
    return rises
      .sort((a, b) => b.increase - a.increase)
      .slice(0, limit);
  }

  // Get score from N days ago
  static getHistoricalScore(figureId: string, ownerId: string, daysAgo: number): number | null {
    const snapshots = this.getSnapshots();
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

    const relevantSnapshots = snapshots
      .filter(s =>
        s.figureId === figureId &&
        s.ownerId === ownerId &&
        s.timestamp >= cutoffTime
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    return relevantSnapshots.length > 0 ? relevantSnapshots[0].score : null;
  }

  // Get snapshot statistics for debugging
  static getSnapshotStats(): {
    totalSnapshots: number;
    uniqueFigures: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
    snapshotsByAge: {
      last7Days: number;
      last30Days: number;
      last365Days: number;
    };
  } {
    const snapshots = this.getSnapshots();
    const now = Date.now();

    const uniqueFigures = new Set(snapshots.map(s => `${s.figureId}-${s.ownerId}`)).size;
    const oldestSnapshot = snapshots.length > 0 ? Math.min(...snapshots.map(s => s.timestamp)) : null;
    const newestSnapshot = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.timestamp)) : null;

    const snapshotsByAge = {
      last7Days: snapshots.filter(s => s.timestamp > now - (7 * 24 * 60 * 60 * 1000)).length,
      last30Days: snapshots.filter(s => s.timestamp > now - (30 * 24 * 60 * 60 * 1000)).length,
      last365Days: snapshots.filter(s => s.timestamp > now - (365 * 24 * 60 * 60 * 1000)).length,
    };

    return {
      totalSnapshots: snapshots.length,
      uniqueFigures,
      oldestSnapshot,
      newestSnapshot,
      snapshotsByAge
    };
  }
}
