export type ReportCategory = 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken';

export interface UserReport {
  id: string;
  reportedUserId: string;
  reportedUsername: string;
  reporterId: string;
  reporterUsername: string;
  category: ReportCategory;
  description?: string;
  timestamp: number;
  status: ReportStatus;
  reviewedAt?: number;
  reviewedBy?: string;
}

const STORAGE_KEY = 'user-reports';

export class ReportingService {
  /**
   * Submit a new user report
   */
  static submitReport(
    reporterId: string,
    reporterUsername: string,
    reportedUserId: string,
    reportedUsername: string,
    category: ReportCategory,
    description?: string
  ): UserReport | null {
    // Prevent self-reporting
    if (reporterId === reportedUserId) {
      return null;
    }

    // Check if user already reported this user in last 30 days
    const existingReport = this.hasRecentReport(reporterId, reportedUserId);
    if (existingReport) {
      return null;
    }

    const reports = this.getAllReports();

    const newReport: UserReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportedUserId,
      reportedUsername,
      reporterId,
      reporterUsername,
      category,
      description: description?.trim(),
      timestamp: Date.now(),
      status: 'pending'
    };

    reports.push(newReport);
    this.saveReports(reports);

    return newReport;
  }

  /**
   * Get all reports
   */
  static getAllReports(): UserReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading reports:', error);
      return [];
    }
  }

  /**
   * Get reports filtered by status
   */
  static getReportsByStatus(status: ReportStatus): UserReport[] {
    return this.getAllReports().filter(report => report.status === status);
  }

  /**
   * Get reports filtered by category
   */
  static getReportsByCategory(category: ReportCategory): UserReport[] {
    return this.getAllReports().filter(report => report.category === category);
  }

  /**
   * Get reports for a specific reported user
   */
  static getReportsForUser(userId: string): UserReport[] {
    return this.getAllReports().filter(report => report.reportedUserId === userId);
  }

  /**
   * Update report status
   */
  static updateReportStatus(
    reportId: string,
    newStatus: ReportStatus,
    reviewerUsername?: string
  ): boolean {
    const reports = this.getAllReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      return false;
    }

    reports[reportIndex].status = newStatus;
    reports[reportIndex].reviewedAt = Date.now();
    if (reviewerUsername) {
      reports[reportIndex].reviewedBy = reviewerUsername;
    }

    this.saveReports(reports);
    return true;
  }

  /**
   * Check if user has reported another user recently (within 30 days)
   */
  static hasRecentReport(reporterId: string, reportedUserId: string): boolean {
    const reports = this.getAllReports();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return reports.some(
      report =>
        report.reporterId === reporterId &&
        report.reportedUserId === reportedUserId &&
        report.timestamp >= thirtyDaysAgo
    );
  }

  /**
   * Get report statistics
   */
  static getReportStats() {
    const reports = this.getAllReports();

    // Count by status
    const byStatus = {
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length,
      action_taken: reports.filter(r => r.status === 'action_taken').length
    };

    // Count by category
    const byCategory = {
      spam: reports.filter(r => r.category === 'spam').length,
      harassment: reports.filter(r => r.category === 'harassment').length,
      inappropriate: reports.filter(r => r.category === 'inappropriate').length,
      fake: reports.filter(r => r.category === 'fake').length,
      other: reports.filter(r => r.category === 'other').length
    };

    // Most reported users
    const userReportCounts = new Map<string, { username: string; count: number }>();
    reports.forEach(report => {
      const existing = userReportCounts.get(report.reportedUserId);
      if (existing) {
        existing.count++;
      } else {
        userReportCounts.set(report.reportedUserId, {
          username: report.reportedUsername,
          count: 1
        });
      }
    });

    const mostReported = Array.from(userReportCounts.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent activity
    const last7Days = reports.filter(
      r => r.timestamp >= Date.now() - (7 * 24 * 60 * 60 * 1000)
    ).length;
    const last30Days = reports.filter(
      r => r.timestamp >= Date.now() - (30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      total: reports.length,
      byStatus,
      byCategory,
      mostReported,
      last7Days,
      last30Days
    };
  }

  /**
   * Delete a report (admin only)
   */
  static deleteReport(reportId: string): boolean {
    const reports = this.getAllReports();
    const filtered = reports.filter(r => r.id !== reportId);

    if (filtered.length === reports.length) {
      return false;
    }

    this.saveReports(filtered);
    return true;
  }

  /**
   * Get pending report count
   */
  static getPendingCount(): number {
    return this.getReportsByStatus('pending').length;
  }

  /**
   * Save reports to localStorage
   */
  private static saveReports(reports: UserReport[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
      console.error('Error saving reports:', error);
    }
  }
}
