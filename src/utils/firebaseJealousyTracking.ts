import { FirebaseReactionsService } from './firebaseReactions';

export class FirebaseJealousyTrackingService {
  /**
   * Get figures with biggest jealousy increases over a time period
   * Compares current score vs score X days ago
   */
  static async getRisingStars(
    figures: Array<{ id: string; userId: string }>,
    daysBack: number = 7
  ): Promise<Array<{
    figureId: string;
    ownerId: string;
    currentScore: number;
    previousScore: number;
    increase: number;
  }>> {
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const rises: Array<{
      figureId: string;
      ownerId: string;
      currentScore: number;
      previousScore: number;
      increase: number;
    }> = [];

    // Calculate scores for each figure
    for (const figure of figures) {
      try {
        // Get current jealousy score
        const currentScore = await FirebaseReactionsService.getJealousyScore(
          figure.id,
          figure.userId
        );

        // Get historical jealousy score (only reactions that existed before cutoff)
        const previousScore = await FirebaseReactionsService.getJealousyScore(
          figure.id,
          figure.userId,
          cutoffTime
        );

        const increase = currentScore - previousScore;

        // Only include figures with positive increases
        if (increase > 0) {
          rises.push({
            figureId: figure.id,
            ownerId: figure.userId,
            currentScore,
            previousScore,
            increase
          });
        }
      } catch (error) {
        console.error(`Failed to calculate rise for figure ${figure.id}:`, error);
      }
    }

    // Sort by increase (descending) - biggest increases first
    return rises.sort((a, b) => b.increase - a.increase);
  }

  /**
   * Get top jealousy figures by current score
   */
  static async getTopJealousyFigures(
    figures: Array<{ id: string; userId: string }>,
    limit: number = 100
  ): Promise<Array<{
    figureId: string;
    ownerId: string;
    jealousyScore: number;
  }>> {
    const scores: Array<{
      figureId: string;
      ownerId: string;
      jealousyScore: number;
    }> = [];

    for (const figure of figures) {
      try {
        const jealousyScore = await FirebaseReactionsService.getJealousyScore(
          figure.id,
          figure.userId
        );

        if (jealousyScore > 0) {
          scores.push({
            figureId: figure.id,
            ownerId: figure.userId,
            jealousyScore
          });
        }
      } catch (error) {
        console.error(`Failed to get jealousy score for figure ${figure.id}:`, error);
      }
    }

    return scores
      .sort((a, b) => b.jealousyScore - a.jealousyScore)
      .slice(0, limit);
  }

  /**
   * Get statistics about reactions and jealousy tracking
   */
  static async getStats(): Promise<{
    totalReactions: number;
    figuresWithReactions: number;
    oldestReaction: number | null;
    newestReaction: number | null;
  }> {
    try {
      // This would require fetching all reactions which might be expensive
      // For now, return placeholder stats
      // In production, you might want to maintain these stats separately
      return {
        totalReactions: 0,
        figuresWithReactions: 0,
        oldestReaction: null,
        newestReaction: null
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalReactions: 0,
        figuresWithReactions: 0,
        oldestReaction: null,
        newestReaction: null
      };
    }
  }
}
