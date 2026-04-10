import { Storage } from './storage';
import type { ActionFigure, PriceHistoryEntry } from '../types';

const PRICE_ALERTS_KEY = 'price-alerts';
const ALERT_RETENTION_DAYS = 30; // Keep alerts for 30 days

export interface PriceAlert {
  id: string;
  figureId: string;
  figureName: string;
  userId: string;
  oldValue: number;
  newValue: number;
  changeAmount: number;
  changePercentage: number;
  timestamp: number;
  seen: boolean;
}

export class PriceAlertsService {
  // Thresholds for significant price changes
  private static SIGNIFICANT_DOLLAR_CHANGE = 20; // $20 or more
  private static SIGNIFICANT_PERCENTAGE_CHANGE = 10; // 10% or more

  private static getKey(userId: string): string {
    return `${PRICE_ALERTS_KEY}-${userId}`;
  }

  // Get all price alerts for a user
  static getAlerts(userId: string): PriceAlert[] {
    try {
      const key = this.getKey(userId);
      const data = localStorage.getItem(key);
      if (!data) return [];

      const alerts: PriceAlert[] = JSON.parse(data);

      // Filter out old alerts
      const cutoffDate = Date.now() - (ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      return alerts.filter(alert => alert.timestamp > cutoffDate);
    } catch (error) {
      console.error('Error reading price alerts:', error);
      return [];
    }
  }

  // Save alerts for a user
  private static saveAlerts(userId: string, alerts: PriceAlert[]): void {
    try {
      const key = this.getKey(userId);
      localStorage.setItem(key, JSON.stringify(alerts));
    } catch (error) {
      console.error('Error saving price alerts:', error);
    }
  }

  // Check if a price change is significant
  private static isSignificantChange(oldValue: number, newValue: number): boolean {
    if (oldValue === newValue) return false;
    if (oldValue === 0) return newValue >= this.SIGNIFICANT_DOLLAR_CHANGE; // New valuation

    const changeAmount = Math.abs(newValue - oldValue);
    const changePercentage = (changeAmount / oldValue) * 100;

    return (
      changeAmount >= this.SIGNIFICANT_DOLLAR_CHANGE ||
      changePercentage >= this.SIGNIFICANT_PERCENTAGE_CHANGE
    );
  }

  // Detect price change for a figure update
  static detectPriceChange(
    userId: string,
    figureId: string,
    figureName: string,
    oldValue: number,
    newValue: number
  ): PriceAlert | null {
    if (!this.isSignificantChange(oldValue, newValue)) {
      return null;
    }

    const changeAmount = newValue - oldValue;
    const changePercentage = oldValue === 0 ? 0 : (changeAmount / oldValue) * 100;

    const alert: PriceAlert = {
      id: `${figureId}-${Date.now()}`,
      figureId,
      figureName,
      userId,
      oldValue,
      newValue,
      changeAmount,
      changePercentage,
      timestamp: Date.now(),
      seen: false
    };

    // Save the alert
    const alerts = this.getAlerts(userId);
    alerts.unshift(alert);
    this.saveAlerts(userId, alerts);

    return alert;
  }

  // Get unseen alerts
  static getUnseenAlerts(userId: string): PriceAlert[] {
    return this.getAlerts(userId).filter(alert => !alert.seen);
  }

  // Mark alert as seen
  static markAsSeen(userId: string, alertId: string): void {
    const alerts = this.getAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.seen = true;
      this.saveAlerts(userId, alerts);
    }
  }

  // Mark all alerts as seen
  static markAllAsSeen(userId: string): void {
    const alerts = this.getAlerts(userId);
    alerts.forEach(alert => alert.seen = true);
    this.saveAlerts(userId, alerts);
  }

  // Clear old alerts
  static clearOldAlerts(userId: string): void {
    const alerts = this.getAlerts(userId);
    const cutoffDate = Date.now() - (ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(alert => alert.timestamp > cutoffDate);
    this.saveAlerts(userId, recentAlerts);
  }

  // Format price change message
  static formatChangeMessage(alert: PriceAlert): string {
    const direction = alert.changeAmount > 0 ? 'increased' : 'decreased';
    const absChange = Math.abs(alert.changeAmount);
    const absPercentage = Math.abs(alert.changePercentage);

    return `${alert.figureName} value ${direction} by $${absChange.toFixed(2)} (${absPercentage.toFixed(1)}%)`;
  }

  // Get price trend for a figure
  static getPriceTrend(figure: ActionFigure): 'up' | 'down' | 'stable' {
    if (!figure.priceHistory || figure.priceHistory.length < 2) {
      return 'stable';
    }

    const sorted = [...figure.priceHistory].sort((a, b) => a.date - b.date);
    const oldest = sorted[0].value;
    const newest = sorted[sorted.length - 1].value;

    if (newest > oldest * 1.1) return 'up'; // 10% increase
    if (newest < oldest * 0.9) return 'down'; // 10% decrease
    return 'stable';
  }

  // Calculate average value from price history
  static getAverageValue(figure: ActionFigure): number {
    if (!figure.priceHistory || figure.priceHistory.length === 0) {
      return figure.currentValue;
    }

    const sum = figure.priceHistory.reduce((acc, entry) => acc + entry.value, 0);
    return sum / figure.priceHistory.length;
  }

  // Get highest value from price history
  static getHighestValue(figure: ActionFigure): number {
    if (!figure.priceHistory || figure.priceHistory.length === 0) {
      return figure.currentValue;
    }

    return Math.max(...figure.priceHistory.map(entry => entry.value), figure.currentValue);
  }

  // Get lowest value from price history
  static getLowestValue(figure: ActionFigure): number {
    if (!figure.priceHistory || figure.priceHistory.length === 0) {
      return figure.currentValue;
    }

    return Math.min(...figure.priceHistory.map(entry => entry.value), figure.currentValue);
  }
}
