import type { Reaction, ReactionType } from '../types/user';
import { AuthService } from './auth';
import { ActivityRecorder } from './communityActivity';
import { FirebaseStorage } from './firebaseStorage';
import { FirebaseAuthService } from './firebaseAuth';

const REACTIONS_KEY = 'app-reactions';

export interface ReactionStats {
  appreciate: number;
  love: number;
  fire: number;
  total: number;
}

export class ReactionsService {
  // Get all reactions
  static getAll(): Reaction[] {
    try {
      const data = localStorage.getItem(REACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading reactions:', error);
      return [];
    }
  }

  // Save all reactions
  private static saveAll(reactions: Reaction[]): void {
    try {
      localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
    } catch (error) {
      console.error('Error saving reactions:', error);
    }
  }

  // Add or update a reaction
  static react(
    figureId: string,
    userId: string,
    displayName: string,
    reactionType: ReactionType
  ): Reaction {
    const reactions = this.getAll();

    // Check if user already reacted to this figure
    const existingIndex = reactions.findIndex(
      r => r.figureId === figureId && r.userId === userId
    );

    let reaction: Reaction;

    if (existingIndex !== -1) {
      // Update existing reaction
      reactions[existingIndex].reactionType = reactionType;
      reactions[existingIndex].timestamp = Date.now();
      this.saveAll(reactions);
      reaction = reactions[existingIndex];
    } else {
      // Create new reaction
      const newReaction: Reaction = {
        id: crypto.randomUUID(),
        figureId,
        userId,
        displayName,
        reactionType,
        timestamp: Date.now()
      };
      reactions.push(newReaction);
      this.saveAll(reactions);
      reaction = newReaction;

      // Record community activity for new reactions only (not updates)
      this.recordReactionActivity(figureId, userId, reactionType).catch(err => {
        console.warn('Failed to record reaction activity:', err);
      });
    }

    return reaction;
  }

  // Record activity when someone reacts to a figure (private helper)
  private static async recordReactionActivity(
    figureId: string,
    userId: string,
    reactionType: ReactionType
  ): Promise<void> {
    try {
      // Get user info
      const user = await FirebaseAuthService.getUserById(userId);
      if (!user) return;

      // Get figure info
      const figure = await FirebaseStorage.getFigure(figureId);
      if (!figure) return;

      // Get figure owner info
      const figureOwner = await FirebaseAuthService.getUserById(figure.userId);
      if (!figureOwner) return;

      // Record as "figure admired" activity
      ActivityRecorder.figureAdmired(user, figure, figureOwner);
    } catch (error) {
      console.error('Error recording reaction activity:', error);
    }
  }

  // Remove a reaction
  static removeReaction(figureId: string, userId: string): void {
    const reactions = this.getAll();
    const filtered = reactions.filter(
      r => !(r.figureId === figureId && r.userId === userId)
    );
    this.saveAll(filtered);
  }

  // Get reactions for a specific figure
  static getReactionsForFigure(figureId: string): Reaction[] {
    return this.getAll().filter(r => r.figureId === figureId);
  }

  // Get reaction stats for a specific figure
  static getStatsForFigure(figureId: string): ReactionStats {
    const reactions = this.getReactionsForFigure(figureId);
    return {
      appreciate: reactions.filter(r => r.reactionType === 'appreciate').length,
      love: reactions.filter(r => r.reactionType === 'love').length,
      fire: reactions.filter(r => r.reactionType === 'fire').length,
      total: reactions.length
    };
  }

  // Get current user's reaction to a figure (if any)
  static getUserReaction(figureId: string, userId: string): Reaction | null {
    return this.getAll().find(
      r => r.figureId === figureId && r.userId === userId
    ) || null;
  }

  // Check if user has reacted with a specific type
  static hasReacted(figureId: string, ownerId: string, userId: string, reactionType: ReactionType): boolean {
    const reaction = this.getUserReaction(figureId, userId);
    return reaction?.reactionType === reactionType;
  }

  // Toggle a specific reaction type (add if not present, remove if present)
  static toggleReaction(figureId: string, ownerId: string, userId: string, reactionType: ReactionType): void {
    const currentReaction = this.getUserReaction(figureId, userId);

    if (currentReaction?.reactionType === reactionType) {
      // Same reaction type - remove it
      this.removeReaction(figureId, userId);
    } else {
      // Different or no reaction - add/update it
      const user = AuthService.getUserById(userId);
      const displayName = user?.displayName || 'User';
      this.react(figureId, userId, displayName, reactionType);
    }
  }

  // Get all reactions for figures owned by a user
  static getReactionsForOwner(ownerId: string, figureIds: string[]): Reaction[] {
    const figureIdSet = new Set(figureIds);
    return this.getAll().filter(r => figureIdSet.has(r.figureId));
  }

  // Get aggregated stats for a user's collection
  static getCollectionStats(ownerId: string, figureIds: string[]): ReactionStats {
    const reactions = this.getReactionsForOwner(ownerId, figureIds);
    return {
      appreciate: reactions.filter(r => r.reactionType === 'appreciate').length,
      love: reactions.filter(r => r.reactionType === 'love').length,
      fire: reactions.filter(r => r.reactionType === 'fire').length,
      total: reactions.length
    };
  }

  // Get top reacted figures for a user
  static getTopFigures(ownerId: string, figureIds: string[], limit: number = 10): Array<{
    figureId: string;
    stats: ReactionStats;
  }> {
    const figureIdSet = new Set(figureIds);
    const reactions = this.getAll().filter(r => figureIdSet.has(r.figureId));

    // Group by figure
    const figureReactions = new Map<string, Reaction[]>();
    reactions.forEach(r => {
      if (!figureReactions.has(r.figureId)) {
        figureReactions.set(r.figureId, []);
      }
      figureReactions.get(r.figureId)!.push(r);
    });

    // Calculate stats and sort by total
    const figureStats = Array.from(figureReactions.entries()).map(([figureId, reacts]) => ({
      figureId,
      stats: {
        appreciate: reacts.filter(r => r.reactionType === 'appreciate').length,
        love: reacts.filter(r => r.reactionType === 'love').length,
        fire: reacts.filter(r => r.reactionType === 'fire').length,
        total: reacts.length
      }
    }));

    return figureStats
      .sort((a, b) => b.stats.total - a.stats.total)
      .slice(0, limit);
  }

  // Calculate reaction score (weighted)
  static calculateScore(stats: ReactionStats): number {
    return stats.appreciate * 1 + stats.love * 2 + stats.fire * 3;
  }

  // Calculate jealousy score for a figure (excluding owner's own reactions)
  // Fire = 5 points, Love = 3 points, Appreciate = 1 point
  static getJealousyScore(figureId: string, ownerId: string): number {
    const reactions = this.getReactionsForFigure(figureId);
    // Exclude reactions from the owner themselves
    const othersReactions = reactions.filter(r => r.userId !== ownerId);

    const appreciate = othersReactions.filter(r => r.reactionType === 'appreciate').length;
    const love = othersReactions.filter(r => r.reactionType === 'love').length;
    const fire = othersReactions.filter(r => r.reactionType === 'fire').length;

    return appreciate * 1 + love * 3 + fire * 5;
  }

  // Get jealousy stats for a figure (excluding owner's reactions)
  static getJealousyStats(figureId: string, ownerId: string): ReactionStats {
    const reactions = this.getReactionsForFigure(figureId);
    // Exclude reactions from the owner themselves
    const othersReactions = reactions.filter(r => r.userId !== ownerId);

    return {
      appreciate: othersReactions.filter(r => r.reactionType === 'appreciate').length,
      love: othersReactions.filter(r => r.reactionType === 'love').length,
      fire: othersReactions.filter(r => r.reactionType === 'fire').length,
      total: othersReactions.length
    };
  }

  // Get top figures by jealousy score
  static getTopFiguresByJealousy(ownerId: string, figureIds: string[], limit: number = 10): Array<{
    figureId: string;
    jealousyScore: number;
    stats: ReactionStats;
  }> {
    const figureScores = figureIds.map(figureId => ({
      figureId,
      jealousyScore: this.getJealousyScore(figureId, ownerId),
      stats: this.getJealousyStats(figureId, ownerId)
    }));

    return figureScores
      .filter(f => f.jealousyScore > 0) // Only include figures with reactions
      .sort((a, b) => b.jealousyScore - a.jealousyScore)
      .slice(0, limit);
  }

  // Get top figures by specific reaction type
  static getTopFiguresByReactionType(
    figureIds: string[],
    reactionType: ReactionType,
    limit: number = 5
  ): Array<{
    figureId: string;
    count: number;
    stats: ReactionStats;
  }> {
    const figureIdSet = new Set(figureIds);
    const reactions = this.getAll().filter(r => figureIdSet.has(r.figureId));

    // Group by figure
    const figureReactions = new Map<string, Reaction[]>();
    reactions.forEach(r => {
      if (!figureReactions.has(r.figureId)) {
        figureReactions.set(r.figureId, []);
      }
      figureReactions.get(r.figureId)!.push(r);
    });

    // Calculate stats and count for specific reaction type
    const figureStats = Array.from(figureReactions.entries()).map(([figureId, reacts]) => {
      const stats = {
        appreciate: reacts.filter(r => r.reactionType === 'appreciate').length,
        love: reacts.filter(r => r.reactionType === 'love').length,
        fire: reacts.filter(r => r.reactionType === 'fire').length,
        total: reacts.length
      };
      return {
        figureId,
        count: stats[reactionType],
        stats
      };
    });

    return figureStats
      .filter(f => f.count > 0) // Only include figures with this reaction type
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Get top figures globally by jealousy score (for all public figures, excluding owner reactions)
  static getTopGlobalFiguresByJealousy(
    allPublicFigureIds: Array<{ figureId: string; ownerId: string }>,
    limit: number = 5
  ): Array<{
    figureId: string;
    ownerId: string;
    jealousyScore: number;
    stats: ReactionStats;
  }> {
    const figureScores = allPublicFigureIds.map(({ figureId, ownerId }) => ({
      figureId,
      ownerId,
      jealousyScore: this.getJealousyScore(figureId, ownerId),
      stats: this.getJealousyStats(figureId, ownerId)
    }));

    return figureScores
      .filter(f => f.jealousyScore > 0)
      .sort((a, b) => b.jealousyScore - a.jealousyScore)
      .slice(0, limit);
  }

  // Get top figures globally by specific reaction type
  static getTopGlobalFiguresByReactionType(
    figureIds: string[],
    reactionType: ReactionType,
    limit: number = 5
  ): Array<{
    figureId: string;
    count: number;
    stats: ReactionStats;
  }> {
    // Same as getTopFiguresByReactionType but doesn't filter by owner
    return this.getTopFiguresByReactionType(figureIds, reactionType, limit);
  }
}
