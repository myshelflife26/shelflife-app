import { FirebaseConversationsService } from './firebaseConversations';
import { FirebaseStorage } from './firebaseStorage';
import type { ActionFigure } from '../types/index';
import type { User } from '../types/user';

/**
 * RichMessagesService - Handle rich message types and content
 *
 * Features:
 * - Figure sharing with embedded previews
 * - Quick response templates
 * - Link previews and metadata
 * - Image sharing (base64 encoded)
 * - Message formatting and parsing
 */

export type RichMessageType = 'text' | 'figure' | 'image' | 'template' | 'trade_request';

export interface RichMessageContent {
  type: RichMessageType;
  text: string;
  figureData?: {
    figureId: string;
    figureName: string;
    imageUrl?: string;
    manufacturer: string;
    series: string;
    currentValue: number;
    condition: string;
  };
  imageData?: {
    url: string; // base64 data URL
    caption?: string;
  };
  templateData?: {
    templateId: string;
    params?: { [key: string]: string };
  };
}

export class RichMessagesService {

  /**
   * Send a figure sharing message
   */
  static async sendFigureMessage(
    fromUser: User,
    toUserId: string,
    figure: ActionFigure,
    message: string,
    conversationId?: string
  ): Promise<void> {
    try {
      const richContent: RichMessageContent = {
        type: 'figure',
        text: message,
        figureData: {
          figureId: figure.id,
          figureName: figure.name,
          imageUrl: figure.images?.[figure.mainImageIndex || 0] || figure.imageUrl,
          manufacturer: figure.manufacturer,
          series: figure.series,
          currentValue: figure.currentValue,
          condition: figure.condition
        }
      };

      const formattedMessage = this.formatRichMessage(richContent);

      if (conversationId) {
        await FirebaseConversationsService.sendMessage(
          conversationId,
          fromUser.id,
          fromUser.displayName,
          formattedMessage,
          figure.id,
          figure.name
        );
      } else {
        // Create new conversation if needed
        const newConversationId = await FirebaseConversationsService.createOrGetConversation(
          [fromUser.id, toUserId],
          { [fromUser.id]: fromUser.displayName },
          figure.id,
          figure.name
        );

        await FirebaseConversationsService.sendMessage(
          newConversationId,
          fromUser.id,
          fromUser.displayName,
          formattedMessage,
          figure.id,
          figure.name
        );
      }
    } catch (error) {
      console.error('Failed to send figure message:', error);
      throw new Error('Failed to send figure message');
    }
  }

  /**
   * Send a template message with quick responses
   */
  static async sendTemplateMessage(
    fromUser: User,
    toUserId: string,
    templateId: string,
    params: { [key: string]: string } = {},
    conversationId?: string
  ): Promise<void> {
    try {
      const template = this.getMessageTemplate(templateId);
      const message = this.fillTemplate(template, params);

      const richContent: RichMessageContent = {
        type: 'template',
        text: message,
        templateData: {
          templateId,
          params
        }
      };

      const formattedMessage = this.formatRichMessage(richContent);

      if (conversationId) {
        await FirebaseConversationsService.sendMessage(
          conversationId,
          fromUser.id,
          fromUser.displayName,
          formattedMessage
        );
      } else {
        const newConversationId = await FirebaseConversationsService.createOrGetConversation(
          [fromUser.id, toUserId],
          { [fromUser.id]: fromUser.displayName }
        );

        await FirebaseConversationsService.sendMessage(
          newConversationId,
          fromUser.id,
          fromUser.displayName,
          formattedMessage
        );
      }
    } catch (error) {
      console.error('Failed to send template message:', error);
      throw new Error('Failed to send template message');
    }
  }

  /**
   * Parse rich message content from text
   */
  static parseRichMessage(messageText: string): RichMessageContent {
    try {
      // Check if it's a formatted rich message
      if (messageText.startsWith('RICH:')) {
        const jsonPart = messageText.substring(5);
        return JSON.parse(jsonPart);
      }

      // Default to text message
      return {
        type: 'text',
        text: messageText
      };
    } catch (error) {
      // If parsing fails, treat as text
      return {
        type: 'text',
        text: messageText
      };
    }
  }

  /**
   * Format rich message content for storage
   */
  static formatRichMessage(content: RichMessageContent): string {
    if (content.type === 'text') {
      return content.text;
    }

    // Store rich content as JSON with prefix
    return `RICH:${JSON.stringify(content)}`;
  }

  /**
   * Get available message templates
   */
  static getMessageTemplates(): { [id: string]: string } {
    return {
      interested_figure: "Hi! I'm interested in your {figureName}. Is it still available?",
      trade_inquiry: "Would you be interested in trading your {figureName} for one of my figures?",
      price_question: "What's your asking price for {figureName}?",
      condition_question: "Could you tell me more about the condition of {figureName}?",
      packaging_question: "Is {figureName} still in original packaging?",
      accessories_question: "Does {figureName} come with all original accessories?",
      shipping_question: "How much would shipping be for {figureName}?",
      thanks: "Thanks for sharing your collection!",
      welcome: "Welcome to the community!",
      nice_collection: "You have an amazing collection!",
      trade_accepted: "Great! I'd be happy to trade with you.",
      trade_declined: "Thanks for the offer, but I'll pass this time.",
      sale_interested: "I'm interested in purchasing this figure. Could we discuss details?",
      custom_build_question: "Love your custom build! What parts did you use?"
    };
  }

  /**
   * Get a specific message template
   */
  static getMessageTemplate(templateId: string): string {
    const templates = this.getMessageTemplates();
    return templates[templateId] || templateId;
  }

  /**
   * Fill template with parameters
   */
  static fillTemplate(template: string, params: { [key: string]: string }): string {
    let result = template;

    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return result;
  }

  /**
   * Generate quick response suggestions based on message content
   */
  static generateQuickResponses(
    messageContent: RichMessageContent,
    currentUserId: string
  ): { text: string; templateId?: string }[] {
    const responses: { text: string; templateId?: string }[] = [];

    switch (messageContent.type) {
      case 'figure':
        responses.push(
          { text: "That's a great figure!", templateId: 'thanks' },
          { text: "Is it for sale?", templateId: 'sale_interested' },
          { text: "Interested in trading?", templateId: 'trade_inquiry' },
          { text: "What condition is it in?", templateId: 'condition_question' }
        );
        break;

      case 'template':
        if (messageContent.templateData?.templateId === 'trade_inquiry') {
          responses.push(
            { text: "I'd be interested!", templateId: 'trade_accepted' },
            { text: "Not right now, thanks", templateId: 'trade_declined' },
            { text: "What are you looking for?" }
          );
        } else if (messageContent.templateData?.templateId === 'interested_figure') {
          responses.push(
            { text: "Yes, it's still available!" },
            { text: "Sorry, it's been sold" },
            { text: "Let me check and get back to you" }
          );
        }
        break;

      default:
        responses.push(
          { text: "Thanks!", templateId: 'thanks' },
          { text: "Awesome collection!", templateId: 'nice_collection' },
          { text: "I'll get back to you soon" }
        );
    }

    return responses;
  }

  /**
   * Extract figure references from message text
   */
  static extractFigureReferences(messageText: string): string[] {
    const figurePattern = /@figure:([a-zA-Z0-9_-]+)/g;
    const matches = [];
    let match;

    while ((match = figurePattern.exec(messageText)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Format figure reference for display
   */
  static formatFigureReference(figureId: string, figureName: string): string {
    return `@figure:${figureId}[${figureName}]`;
  }

  /**
   * Get message preview text (for conversation lists)
   */
  static getMessagePreview(content: RichMessageContent): string {
    switch (content.type) {
      case 'figure':
        return `📦 Shared: ${content.figureData?.figureName || 'Figure'}`;

      case 'image':
        return `📷 ${content.imageData?.caption || 'Image'}`;

      case 'template':
        return content.text;

      default:
        return content.text;
    }
  }

  /**
   * Check if message contains sensitive information
   */
  static containsSensitiveInfo(messageText: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b[\w.-]+@[\w.-]+\.\w+\b/, // Email addresses (basic)
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/ // Phone numbers
    ];

    return sensitivePatterns.some(pattern => pattern.test(messageText));
  }
}