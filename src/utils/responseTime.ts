import type { Message } from '../types/user';

/**
 * Calculate average response time for a user based on their message history
 * @param userId - The user ID to calculate response time for
 * @param messages - All messages (inbox + sent) involving this user
 * @returns Average response time in hours, or null if insufficient data
 */
export function calculateAverageResponseTime(
  userId: string,
  messages: Message[]
): number | null {
  // Group messages into conversations
  const conversations = new Map<string, Message[]>();

  messages.forEach(msg => {
    const otherUserId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
    if (!conversations.has(otherUserId)) {
      conversations.set(otherUserId, []);
    }
    conversations.get(otherUserId)!.push(msg);
  });

  // Calculate response times
  const responseTimes: number[] = [];

  conversations.forEach(convo => {
    // Sort by timestamp
    convo.sort((a, b) => a.timestamp - b.timestamp);

    // Find pairs where user received a message and then responded
    for (let i = 0; i < convo.length - 1; i++) {
      const current = convo[i];
      const next = convo[i + 1];

      // If current message was to the user and next message was from the user
      if (current.toUserId === userId && next.fromUserId === userId) {
        const responseTimeMs = next.timestamp - current.timestamp;
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60);

        // Only count reasonable response times (< 7 days)
        if (responseTimeHours < 168) {
          responseTimes.push(responseTimeHours);
        }
      }
    }
  });

  // Return average if we have data
  if (responseTimes.length === 0) return null;

  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal
}

/**
 * Format response time for display
 * @param hours - Response time in hours
 * @returns Human-readable string
 */
export function formatResponseTime(hours: number | null): string {
  if (hours === null) return 'No data';

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }

  if (hours < 24) {
    return `${Math.round(hours)} hr`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Get response time rating (fast, average, slow)
 */
export function getResponseTimeRating(hours: number | null): 'fast' | 'average' | 'slow' | 'unknown' {
  if (hours === null) return 'unknown';
  if (hours < 4) return 'fast';
  if (hours < 24) return 'average';
  return 'slow';
}
