import { ReactionsService } from './reactions';

interface JealousySnapshot {
  figureId: string;
  ownerId: string;
  score: number;
  timestamp: number;
}

const STORAGE_KEY = 'jealousy-snapshots';
const SNAPSHOT_RETENTION_DAYS = 7;

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

    publicFigures.forEach(figure => {
      const score = ReactionsService.getJealousyScore(figure.id, figure.userId);

      // Only record if score > 0
      if (score > 0) {
        snapshots.push({
          figureId: figure.id,
          ownerId: figure.userId,
          score,
          timestamp: now
        });
      }
    });

    this.saveSnapshots(snapshots);
  }

  // Get figures with biggest jealousy increases
  static getRisingStars(currentFigures: Array<{ id: string; userId: string }>, limit: number = 10): Array<{
    figureId: string;
    ownerId: string;
    currentScore: number;
    previousScore: number;
    increase: number;
  }> {
    const snapshots = this.getSnapshots();
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

      // Find oldest snapshot for this figure within retention period
      const figureSnapshots = snapshots
        .filter(s => s.figureId === figure.id && s.ownerId === figure.userId)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (figureSnapshots.length === 0) {
        // No history, treat as new with full score as increase
        rises.push({
          figureId: figure.id,
          ownerId: figure.userId,
          currentScore,
          previousScore: 0,
          increase: currentScore
        });
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
}
