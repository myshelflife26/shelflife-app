import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CommentReport } from '../types/commentReport';
import { FirebaseNotifications } from './firebaseNotifications';

export class CommentReportsService {
  private static readonly REPORTS_COLLECTION = 'commentReports';

  /**
   * Create a new comment report
   */
  static async createReport(
    commentId: string,
    figureId: string,
    figureName: string,
    figureOwnerId: string,
    commentText: string,
    commentAuthorId: string,
    commentAuthorName: string,
    reportedBy: string,
    reporterName: string,
    reporterUsername: string,
    reason: string
  ): Promise<CommentReport> {
    const reportData: Omit<CommentReport, 'id'> = {
      commentId,
      figureId,
      figureName,
      figureOwnerId,
      commentText: commentText.substring(0, 500), // Truncate for storage
      commentAuthorId,
      commentAuthorName,
      reportedBy,
      reporterName,
      reporterUsername,
      reason,
      timestamp: Date.now(),
      status: 'pending',
    };

    const docRef = await addDoc(collection(db, this.REPORTS_COLLECTION), reportData);

    // Notify figure owner about the report
    await FirebaseNotifications.createReportNotification(
      figureOwnerId,
      figureId,
      figureName,
      commentId,
      docRef.id,
      reason || 'No reason provided',
      reportedBy,
      reporterName
    );

    return {
      id: docRef.id,
      ...reportData,
    };
  }

  /**
   * Get all reports for a figure owner (to display in their admin view)
   */
  static async getReportsByOwner(figureOwnerId: string): Promise<CommentReport[]> {
    const q = query(
      collection(db, this.REPORTS_COLLECTION),
      where('figureOwnerId', '==', figureOwnerId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as CommentReport));
  }

  /**
   * Get pending reports for a figure owner
   */
  static async getPendingReportsByOwner(figureOwnerId: string): Promise<CommentReport[]> {
    const q = query(
      collection(db, this.REPORTS_COLLECTION),
      where('figureOwnerId', '==', figureOwnerId),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as CommentReport));
  }

  /**
   * Subscribe to reports in real-time for a figure owner
   */
  static subscribeToReports(
    figureOwnerId: string,
    callback: (reports: CommentReport[]) => void
  ): () => void {
    const q = query(
      collection(db, this.REPORTS_COLLECTION),
      where('figureOwnerId', '==', figureOwnerId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CommentReport));
      callback(reports);
    });
  }

  /**
   * Update report status (dismiss, take action, etc.)
   */
  static async updateReportStatus(
    reportId: string,
    status: CommentReport['status'],
    reviewedBy: string,
    actionTaken?: CommentReport['actionTaken'],
    reviewNotes?: string
  ): Promise<void> {
    const reportRef = doc(db, this.REPORTS_COLLECTION, reportId);
    await updateDoc(reportRef, {
      status,
      reviewedBy,
      reviewedAt: Date.now(),
      ...(actionTaken && { actionTaken }),
      ...(reviewNotes && { reviewNotes }),
    });
  }

  /**
   * Dismiss a report
   */
  static async dismissReport(reportId: string, reviewedBy: string, notes?: string): Promise<void> {
    await this.updateReportStatus(reportId, 'dismissed', reviewedBy, undefined, notes);
  }

  /**
   * Mark report as action taken
   */
  static async markActionTaken(
    reportId: string,
    reviewedBy: string,
    actionTaken: CommentReport['actionTaken'],
    notes?: string
  ): Promise<void> {
    await this.updateReportStatus(reportId, 'action-taken', reviewedBy, actionTaken, notes);
  }

  /**
   * Delete a report
   */
  static async deleteReport(reportId: string): Promise<void> {
    const reportRef = doc(db, this.REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);
  }

  /**
   * Get report count for a figure owner
   */
  static async getPendingReportCount(figureOwnerId: string): Promise<number> {
    const q = query(
      collection(db, this.REPORTS_COLLECTION),
      where('figureOwnerId', '==', figureOwnerId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}
