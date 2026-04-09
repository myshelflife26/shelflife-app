import { useState, useEffect } from 'react';
import { SettingsService } from '../utils/settings';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { FirebaseMessagesService } from '../utils/firebaseMessages';
import { FirebaseStorage } from '../utils/firebaseStorage';
import { AdmirersService } from '../utils/admirers';
import { BlockingService } from '../utils/blocking';
import { ReportingService } from '../utils/reporting';
import type { ReportCategory } from '../utils/reporting';
import { FieldUsageService } from '../utils/fieldUsage';
import { toastManager } from '../utils/toastManager';
import type { AppSettings, ActionFigure } from '../types/index';
import type { User } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { X, Plus, RotateCcw, Shield, ShieldOff, Eye, EyeOff, Star, UserPlus, UserMinus, Check, User as UserIcon, Flag, Moon, Sun, BookOpen, Database, Mail, Upload, Save, Trash2, Pencil, Download, ExternalLink } from 'lucide-react';
import { CustomFieldsManager } from './CustomFieldsManager';
import { AdminCustomFieldsManager } from './AdminCustomFieldsManager';
import { ValueMigrationDialog } from './ValueMigrationDialog';
import { BlockReasonDialog } from './BlockReasonDialog';
import { ReportReasonDialog } from './ReportReasonDialog';
import { MasterFiguresService, type MasterFigure, DEFAULT_FIGURE_IMAGE } from '../utils/masterFigures';
import { getScraperConfigs, getScraperById, type ScrapedFigure, type ScrapeResult } from '../utils/scrapers';

interface SettingsPageProps {
  currentUser: User;
  setCurrentPage: (page: 'collection' | 'feed' | 'settings' | 'users' | 'gallery' | 'browse' | 'messages' | 'blocked' | 'reports' | 'help') => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  activeSection?: 'general' | 'privacy' | 'customFields' | 'system';
}

// OptionList component - moved outside to prevent re-creation on each render
const OptionList = ({
  title,
  options,
  onRemove,
  newValue,
  onNewValueChange,
  onAdd
}: {
  title: string;
  options: string[];
  onRemove: (option: string) => void;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>

    <div className="space-y-2 mb-4">
      {options.map((option) => (
        <div
          key={option}
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
        >
          <span className="text-gray-900 dark:text-white">{option}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => onRemove(option)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>

    <div className="flex gap-2">
      <Input
        placeholder={`Add new ${title.toLowerCase()}`}
        value={newValue}
        onChange={(e) => onNewValueChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onAdd()}
      />
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
  </div>
);

export function SettingsPage({ currentUser, setCurrentPage, darkMode, setDarkMode, activeSection }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(SettingsService.getSettings());
  const canManageSystem = currentUser.role === 'management'; // Management only
  const isAdminUser = currentUser.role && ['management', 'manager'].includes(currentUser.role); // Management or Manager
  const [collectionPublic, setCollectionPublic] = useState(currentUser.collectionPublic || false);
  const [autoApproveAdmirers, setAutoApproveAdmirers] = useState(currentUser.autoApproveAdmirers || false);
  const [admirers, setAdmirers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newValues, setNewValues] = useState({
    condition: '',
    category: '',
    manufacturer: '',
    series: '',
    version: '',
    size: '',
    packaging: ''
  });
  const [migrationDialog, setMigrationDialog] = useState<{
    field: keyof ActionFigure;
    fieldLabel: string;
    value: string;
    availableValues: string[];
  } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: string; username: string } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [userToReport, setUserToReport] = useState<{ id: string; username: string } | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    fieldType: 'condition',
    optionValue: '',
    reason: ''
  });
  const [systemRequests, setSystemRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  // Master figures state
  const [masterFigures, setMasterFigures] = useState<MasterFigure[]>([]);
  const [addFigureDialogOpen, setAddFigureDialogOpen] = useState(false);
  const [editFigureDialogOpen, setEditFigureDialogOpen] = useState(false);
  const [editingFigure, setEditingFigure] = useState<MasterFigure | null>(null);
  const [masterFiguresPage, setMasterFiguresPage] = useState(1);
  const [masterFiguresSearch, setMasterFiguresSearch] = useState('');
  const masterFiguresPerPage = 10;
  const [newMasterFigure, setNewMasterFigure] = useState({
    name: '',
    version: '',
    year: '',
    series: '',
    manufacturer: '',
    category: '',
    size: '',
    productLine: '',
    subProductLine: '',
    packaging: '',
    imageUrl: '',
    notes: '',
    sourceName: '',
    sourceUrl: ''
  });

  // Scraper state
  const [scraperDialogOpen, setScraperDialogOpen] = useState(false);
  const [selectedScraperId, setSelectedScraperId] = useState('');
  const [scraperInput, setScraperInput] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedFigure[]>([]);
  const [scrapeErrors, setScrapeErrors] = useState<string[]>([]);

  const loadSettings = () => {
    setSettings(SettingsService.getSettings());
  };

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load admirers data
  useEffect(() => {
    const loadAdmirersData = async () => {
      const admirersData = await AdmirersService.getAdmirers(currentUser.id);
      const requestsData = await AdmirersService.getPendingRequests(currentUser.id);
      setAdmirers(admirersData);
      setPendingRequests(requestsData);
    };
    loadAdmirersData();
  }, [currentUser.id, refreshKey]);

  // Load system option requests (admin only)
  useEffect(() => {
    if (currentUser.role === 'management') {
      const loadSystemRequests = async () => {
        const inbox = await FirebaseMessagesService.getInbox(currentUser.id);
        const requests = inbox.filter(msg => msg.subject.startsWith('System Option Request:'));
        setSystemRequests(requests);
      };
      loadSystemRequests();
    }
  }, [currentUser.id, currentUser.role]);

  // Load master figures (all users can view)
  useEffect(() => {
    const loadMasterFigures = async () => {
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
    };
    loadMasterFigures();
  }, []);

  // Handle collection privacy toggle
  const handleCollectionPrivacyChange = async (isPublic: boolean) => {
    const confirmMessage = isPublic
      ? 'Make your entire collection public?\n\nAll figures will be visible to other users in the Browse section.\n\nYou can still override individual figures to keep them private.'
      : 'Make your entire collection private?\n\nYour figures will no longer be visible to other users unless individually marked as public.';

    if (confirm(confirmMessage)) {
      await FirebaseAuthService.updateUser(currentUser.id, { collectionPublic: isPublic });
      setCollectionPublic(isPublic);
      // Reload the page to reflect changes
      window.location.reload();
    }
  };

  // Handle auto-approve admirers toggle
  const handleAutoApproveChange = async (autoApprove: boolean) => {
    await AdmirersService.setAutoApprove(currentUser.id, autoApprove);
    setAutoApproveAdmirers(autoApprove);
    if (autoApprove) {
      toastManager.success('Auto-approve enabled! New admirer requests will be automatically approved.');
    }
  };

  // Handle approve admirer request
  const handleApproveRequest = async (admirerId: string) => {
    await AdmirersService.approveRequest(currentUser.id, admirerId);
    setRefreshKey(prev => prev + 1);
  };

  // Handle reject admirer request
  const handleRejectRequest = async (admirerId: string) => {
    if (confirm('Reject this admirer request?')) {
      await AdmirersService.rejectRequest(currentUser.id, admirerId);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Handle remove admirer
  const handleRemoveAdmirer = async (admirerId: string) => {
    if (confirm('Remove this admirer from your collection?')) {
      await AdmirersService.removeAdmirer(currentUser.id, admirerId);
      setRefreshKey(prev => prev + 1);
    }
  };

  // Handle block admirer - open dialog
  const handleBlockAdmirer = (admirerId: string, admirerName: string) => {
    setUserToBlock({ id: admirerId, username: admirerName });
    setBlockDialogOpen(true);
  };

  // Confirm block with optional reason
  const confirmBlock = (reason?: string) => {
    if (!userToBlock) return;

    BlockingService.blockUser(currentUser.id, userToBlock.id, reason);
    toastManager.success(`Blocked ${userToBlock.username}`);
    setRefreshKey(prev => prev + 1);
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  // Cancel block
  const cancelBlock = () => {
    setBlockDialogOpen(false);
    setUserToBlock(null);
  };

  const handleReportAdmirer = (admirerId: string, admirerName: string) => {
    setUserToReport({ id: admirerId, username: admirerName });
    setReportDialogOpen(true);
  };

  const confirmReport = (category: ReportCategory, description?: string) => {
    if (!userToReport) return;

    const report = ReportingService.submitReport(
      currentUser.id,
      currentUser.username,
      userToReport.id,
      userToReport.username,
      category,
      description
    );

    if (report) {
      toastManager.success(`Reported ${userToReport.username}`);
    } else {
      toastManager.error('Unable to submit report. You may have already reported this user recently.');
    }

    setReportDialogOpen(false);
    setUserToReport(null);
  };

  const cancelReport = () => {
    setReportDialogOpen(false);
    setUserToReport(null);
  };

  const handleAddCondition = () => {
    if (newValues.condition.trim()) {
      SettingsService.addConditionOption(newValues.condition.trim());
      setNewValues({ ...newValues, condition: '' });
      loadSettings();
    }
  };

  const handleRemoveCondition = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('condition', option)) {
      // Show migration dialog
      setMigrationDialog({
        field: 'condition',
        fieldLabel: 'Condition',
        value: option,
        availableValues: settings.conditionOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from condition options?`)) {
      SettingsService.removeConditionOption(option);
      loadSettings();
    }
  };

  const handleAddCategory = () => {
    if (newValues.category.trim()) {
      SettingsService.addCategoryOption(newValues.category.trim());
      setNewValues({ ...newValues, category: '' });
      loadSettings();
    }
  };

  const handleRemoveCategory = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('category', option)) {
      setMigrationDialog({
        field: 'category',
        fieldLabel: 'Category',
        value: option,
        availableValues: settings.categoryOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from category options?`)) {
      SettingsService.removeCategoryOption(option);
      loadSettings();
    }
  };

  const handleAddManufacturer = () => {
    if (newValues.manufacturer.trim()) {
      SettingsService.addManufacturerOption(newValues.manufacturer.trim());
      setNewValues({ ...newValues, manufacturer: '' });
      loadSettings();
    }
  };

  const handleRemoveManufacturer = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('manufacturer', option)) {
      setMigrationDialog({
        field: 'manufacturer',
        fieldLabel: 'Manufacturer',
        value: option,
        availableValues: settings.manufacturerOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from manufacturer options?`)) {
      SettingsService.removeManufacturerOption(option);
      loadSettings();
    }
  };

  const handleAddSize = () => {
    if (newValues.size.trim()) {
      SettingsService.addSizeOption(newValues.size.trim());
      setNewValues({ ...newValues, size: '' });
      loadSettings();
    }
  };

  const handleRemoveSize = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('size', option)) {
      setMigrationDialog({
        field: 'size',
        fieldLabel: 'Size',
        value: option,
        availableValues: settings.sizeOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from size options?`)) {
      SettingsService.removeSizeOption(option);
      loadSettings();
    }
  };

  const handleAddPackaging = () => {
    if (newValues.packaging.trim()) {
      SettingsService.addPackagingOption(newValues.packaging.trim());
      setNewValues({ ...newValues, packaging: '' });
      loadSettings();
    }
  };

  const handleRemovePackaging = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('packaging', option)) {
      setMigrationDialog({
        field: 'packaging',
        fieldLabel: 'Packaging',
        value: option,
        availableValues: settings.packagingOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from packaging options?`)) {
      SettingsService.removePackagingOption(option);
      loadSettings();
    }
  };

  const handleAddSeries = () => {
    if (newValues.series.trim()) {
      SettingsService.addSeriesOption(newValues.series.trim());
      setNewValues({ ...newValues, series: '' });
      loadSettings();
    }
  };

  const handleRemoveSeries = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('productLine', option)) {
      setMigrationDialog({
        field: 'productLine',
        fieldLabel: 'Series',
        value: option,
        availableValues: settings.seriesOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from series options?`)) {
      SettingsService.removeSeriesOption(option);
      loadSettings();
    }
  };

  const handleAddVersion = () => {
    if (newValues.version.trim()) {
      SettingsService.addVersionOption(newValues.version.trim());
      setNewValues({ ...newValues, version: '' });
      loadSettings();
    }
  };

  const handleRemoveVersion = (option: string) => {
    // Check if value is in use
    if (FieldUsageService.isValueInUse('version', option)) {
      setMigrationDialog({
        field: 'version',
        fieldLabel: 'Version',
        value: option,
        availableValues: settings.versionOptions.filter(v => v !== option)
      });
      return;
    }

    if (confirm(`Remove "${option}" from version options?`)) {
      SettingsService.removeVersionOption(option);
      loadSettings();
    }
  };

  // Handle migration completion
  const handleMigration = (oldValue: string, newValue: string) => {
    if (!migrationDialog) return;

    const result = FieldUsageService.migrateValue(migrationDialog.field, oldValue, newValue);

    if (result.success) {
      // Remove the old value from settings after successful migration
      switch (migrationDialog.field) {
        case 'condition':
          SettingsService.removeConditionOption(oldValue);
          break;
        case 'category':
          SettingsService.removeCategoryOption(oldValue);
          break;
        case 'manufacturer':
          SettingsService.removeManufacturerOption(oldValue);
          break;
        case 'size':
          SettingsService.removeSizeOption(oldValue);
          break;
        case 'packaging':
          SettingsService.removePackagingOption(oldValue);
          break;
        case 'productLine':
          SettingsService.removeSeriesOption(oldValue);
          break;
        case 'version':
          SettingsService.removeVersionOption(oldValue);
          break;
      }

      alert(`Successfully migrated ${result.count} figure(s) from "${oldValue}" to "${newValue}"`);
      loadSettings();
      setMigrationDialog(null);

      // Reload the page to ensure all data is fresh
      window.location.reload();
    } else {
      alert(`Migration failed: ${result.error}`);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all dropdown options to defaults? This cannot be undone.')) {
      SettingsService.resetToDefaults();
      loadSettings();
    }
  };

  const handleRequestOption = async () => {
    if (!requestForm.optionValue.trim()) {
      toastManager.warning('Please enter the option value you want to request');
      return;
    }

    try {
      // Get all admin users
      const allUsers = await FirebaseAuthService.getAllUsers();
      const adminUsers = allUsers.filter(u => u.role === 'management');

      if (adminUsers.length === 0) {
        toastManager.error('No admin users found');
        return;
      }

      // Send message to all admins
      const fieldLabels: Record<string, string> = {
        condition: 'Condition',
        category: 'Category',
        manufacturer: 'Manufacturer',
        series: 'Series',
        version: 'Version',
        size: 'Size',
        packaging: 'Packaging'
      };

      const subject = `System Option Request: Add "${requestForm.optionValue}" to ${fieldLabels[requestForm.fieldType]}`;
      const message = `User ${currentUser.displayName} (@${currentUser.username}) has requested to add a new system option:\n\nField Type: ${fieldLabels[requestForm.fieldType]}\nRequested Option: ${requestForm.optionValue}\n${requestForm.reason ? `\nReason: ${requestForm.reason}` : ''}`;

      for (const admin of adminUsers) {
        await FirebaseMessagesService.send(
          currentUser.id,
          currentUser.displayName,
          admin.id,
          subject,
          message
        );
      }

      toastManager.success('Request sent to administrators!');
      setRequestDialogOpen(false);
      setRequestForm({ fieldType: 'condition', optionValue: '', reason: '' });
    } catch (error) {
      console.error('Failed to send request:', error);
      toastManager.error('Failed to send request');
    }
  };

  const reloadSystemRequests = async () => {
    const inbox = await FirebaseMessagesService.getInbox(currentUser.id);
    const requests = inbox.filter(msg => msg.subject.startsWith('System Option Request:'));
    setSystemRequests(requests);
  };

  const handleReviewedRequest = async (request: any) => {
    // Send message back to user
    await FirebaseMessagesService.send(
      currentUser.id,
      currentUser.displayName,
      request.fromUserId,
      `Re: ${request.subject}`,
      `Your system option request has been reviewed by ${currentUser.displayName}.\n\nOriginal Request:\n${request.message}\n\nStatus: Under Review\nWe'll let you know once a decision has been made.`
    );

    // Delete the original request
    await FirebaseMessagesService.delete(request.id);
    await reloadSystemRequests();
    toastManager.success('Request marked as reviewed and user notified');
  };

  const handleUpdatedRequest = async (request: any) => {
    // Send message back to user
    await FirebaseMessagesService.send(
      currentUser.id,
      currentUser.displayName,
      request.fromUserId,
      `Re: ${request.subject}`,
      `Your system option request has been approved and added!\n\nOriginal Request:\n${request.message}\n\nStatus: ✅ Approved & Added\nThe requested option has been added to the system by ${currentUser.displayName}. You can now use it in your collection.`
    );

    // Delete the original request
    await FirebaseMessagesService.delete(request.id);
    await reloadSystemRequests();
    toastManager.success('Request marked as updated and user notified');
  };

  const handleDenyRequest = (request: any) => {
    setSelectedRequest(request);
    setDenyDialogOpen(true);
  };

  const confirmDenyRequest = async () => {
    if (!selectedRequest || !denyReason.trim()) {
      toastManager.warning('Please provide a reason for denial');
      return;
    }

    // Send message back to user with denial reason
    await FirebaseMessagesService.send(
      currentUser.id,
      currentUser.displayName,
      selectedRequest.fromUserId,
      `Re: ${selectedRequest.subject}`,
      `Your system option request has been reviewed.\n\nOriginal Request:\n${selectedRequest.message}\n\nStatus: ❌ Denied\nReason: ${denyReason}\n\nReviewed by: ${currentUser.displayName}`
    );

    // Delete the original request
    await FirebaseMessagesService.delete(selectedRequest.id);
    await reloadSystemRequests();

    setDenyDialogOpen(false);
    setDenyReason('');
    setSelectedRequest(null);
    toastManager.success('Request denied and user notified');
  };

  const cancelDenyRequest = () => {
    setDenyDialogOpen(false);
    setDenyReason('');
    setSelectedRequest(null);
  };

  // Master Figures handlers
  const handleAddMasterFigure = async () => {
    if (!newMasterFigure.name || !newMasterFigure.manufacturer || !newMasterFigure.productLine) {
      toastManager.warning('Please fill in Name, Manufacturer, and Product Line at minimum');
      return;
    }

    const result = await MasterFiguresService.add(
      {
        name: newMasterFigure.name,
        version: newMasterFigure.version || undefined,
        year: newMasterFigure.year ? parseInt(newMasterFigure.year) : undefined,
        series: newMasterFigure.series,
        manufacturer: newMasterFigure.manufacturer,
        category: newMasterFigure.category || '',
        size: newMasterFigure.size || undefined,
        productLine: newMasterFigure.productLine || undefined,
        subProductLine: newMasterFigure.subProductLine || undefined,
        packaging: newMasterFigure.packaging || undefined,
        imageUrl: newMasterFigure.imageUrl || undefined,
        notes: newMasterFigure.notes || undefined,
        sourceName: newMasterFigure.sourceName || undefined,
        sourceUrl: newMasterFigure.sourceUrl || undefined,
        createdBy: currentUser.id,
        createdByName: currentUser.displayName,
        source: 'admin' as const
      },
      currentUser.id,
      currentUser.displayName
    );

    if (result) {
      toastManager.success(`Added ${newMasterFigure.name} to master database`);
      setAddFigureDialogOpen(false);
      setNewMasterFigure({
        name: '',
        version: '',
        year: '',
        series: '',
        manufacturer: '',
        category: '',
        size: '',
        productLine: '',
        subProductLine: '',
        packaging: '',
        imageUrl: '',
        notes: '',
        sourceName: '',
        sourceUrl: ''
      });

      // Reload master figures
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
      setMasterFiguresPage(1); // Reset to first page
    } else {
      toastManager.error('Failed to add figure');
    }
  };

  const handleDeleteMasterFigure = async (figureId: string, figureName: string) => {
    if (confirm(`Delete "${figureName}" from the master database?`)) {
      const success = await MasterFiguresService.delete(figureId);
      if (success) {
        toastManager.success(`Deleted ${figureName}`);
        const figures = await MasterFiguresService.getAll();
        setMasterFigures(figures);

        // Adjust page if current page becomes empty
        const totalPages = Math.ceil(figures.length / masterFiguresPerPage);
        if (masterFiguresPage > totalPages && totalPages > 0) {
          setMasterFiguresPage(totalPages);
        }
      } else {
        toastManager.error('Failed to delete figure');
      }
    }
  };

  const handleEditMasterFigure = (figure: MasterFigure) => {
    setEditingFigure(figure);
    setEditFigureDialogOpen(true);
  };

  const handleSaveEditedFigure = async () => {
    if (!editingFigure || !editingFigure.name || !editingFigure.manufacturer || !editingFigure.productLine) {
      toastManager.warning('Please fill in Name, Manufacturer, and Product Line at minimum');
      return;
    }

    const updates = {
      name: editingFigure.name,
      version: editingFigure.version || undefined,
      year: editingFigure.year,
      series: editingFigure.series,
      manufacturer: editingFigure.manufacturer,
      category: editingFigure.category || '',
      size: editingFigure.size || undefined,
      productLine: editingFigure.productLine || undefined,
      subProductLine: editingFigure.subProductLine || undefined,
      packaging: editingFigure.packaging || undefined,
      imageUrl: editingFigure.imageUrl || undefined,
      notes: editingFigure.notes || undefined,
      sourceName: editingFigure.sourceName || undefined,
      sourceUrl: editingFigure.sourceUrl || undefined,
    };

    const success = await MasterFiguresService.update(editingFigure.id, updates);

    if (success) {
      toastManager.success(`Updated ${editingFigure.name}`);
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
      setEditFigureDialogOpen(false);
      setEditingFigure(null);
    } else {
      toastManager.error('Failed to update figure');
    }
  };

  const handleImportMasterFigures = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate and import
        if (!Array.isArray(data)) {
          toastManager.error('Invalid file format. Expected an array of figures.');
          return;
        }

        const count = await MasterFiguresService.importMany(data, currentUser.id, currentUser.displayName, 'admin');
        toastManager.success(`Successfully imported ${count} master figures!`);

        // Reload master figures
        const figures = await MasterFiguresService.getAll();
        setMasterFigures(figures);
        setMasterFiguresPage(1); // Reset to first page
      } catch (error) {
        console.error('Import error:', error);
        toastManager.error('Failed to import figures. Please check the file format.');
      }
    };
    input.click();
  };

  const handleMigrateExistingFigures = async () => {
    if (!confirm('Migrate all your existing figures to the master database?\n\nThis will add all figures from your personal collection to the master database (duplicates will be skipped).')) {
      return;
    }

    try {
      // Get all figures for current user from Firebase
      const userFigures = await FirebaseStorage.getFigures(currentUser.id);

      if (userFigures.length === 0) {
        toastManager.info('No figures to migrate');
        return;
      }

      toastManager.info(`Migrating ${userFigures.length} figures...`);

      // Migrate figures
      const count = await MasterFiguresService.migrateUserFigures(
        currentUser.id,
        currentUser.displayName,
        userFigures
      );

      toastManager.success(`Successfully migrated ${count} figures to master database!`);

      // Reload master figures
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
      setMasterFiguresPage(1);
    } catch (error) {
      console.error('Migration error:', error);
      toastManager.error('Failed to migrate figures');
    }
  };

  // Scraper handlers
  const handleOpenScraper = () => {
    setScraperDialogOpen(true);
    setScrapedData([]);
    setScrapeErrors([]);
    setScraperInput('');
    setSelectedScraperId('');
  };

  const handleRunScraper = async () => {
    if (!selectedScraperId) {
      toastManager.warning('Please select a scraper');
      return;
    }

    const scraper = getScraperById(selectedScraperId);
    if (!scraper) {
      toastManager.error('Scraper not found');
      return;
    }

    if (scraper.config.requiresInput && !scraperInput.trim()) {
      toastManager.warning(scraper.config.inputPlaceholder || 'Please provide input');
      return;
    }

    setScraping(true);
    setScrapedData([]);
    setScrapeErrors([]);

    try {
      toastManager.info('Scraping data...');
      const result: ScrapeResult = await scraper.scrape(scraperInput);

      if (result.success && result.figures.length > 0) {
        setScrapedData(result.figures);
        toastManager.success(`Found ${result.figures.length} figures!`);
      } else if (result.errors.length > 0) {
        setScrapeErrors(result.errors);
        toastManager.error('Scraping failed');
      } else {
        toastManager.warning('No figures found');
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      setScrapeErrors([error.message || 'Unknown error']);
      toastManager.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const handleImportScrapedData = async () => {
    if (scrapedData.length === 0) {
      toastManager.warning('No data to import');
      return;
    }

    if (!confirm(`Import ${scrapedData.length} figures to the master database?\n\nDuplicates will be automatically skipped.`)) {
      return;
    }

    try {
      toastManager.info(`Importing ${scrapedData.length} figures...`);

      let imported = 0;
      let skipped = 0;

      for (const scrapedFigure of scrapedData) {
        // Convert scraped figure to master figure format
        const masterFigure = {
          name: scrapedFigure.name,
          version: scrapedFigure.version,
          year: scrapedFigure.year,
          series: scrapedFigure.series || '',
          manufacturer: scrapedFigure.manufacturer || 'Unknown',
          category: scrapedFigure.category || '',
          size: scrapedFigure.size,
          productLine: scrapedFigure.productLine,
          subProductLine: scrapedFigure.subProductLine,
          packaging: scrapedFigure.packaging,
          imageUrl: scrapedFigure.imageUrl,
          notes: scrapedFigure.notes,
          sourceName: scrapedFigure.sourceName,
          sourceUrl: scrapedFigure.sourceUrl,
          createdBy: currentUser.id,
          createdByName: currentUser.displayName,
          source: 'import' as const
        };

        // Check for duplicates
        const duplicate = await MasterFiguresService.findDuplicate(masterFigure);
        if (duplicate) {
          skipped++;
          continue;
        }

        // Add to master database
        const success = await MasterFiguresService.add(
          masterFigure,
          currentUser.id,
          currentUser.displayName
        );

        if (success) {
          imported++;
        }
      }

      toastManager.success(`Imported ${imported} figures! (${skipped} duplicates skipped)`);

      // Reload master figures
      const figures = await MasterFiguresService.getAll();
      setMasterFigures(figures);
      setMasterFiguresPage(1);

      // Close dialog
      setScraperDialogOpen(false);
      setScrapedData([]);
      setScrapeErrors([]);
    } catch (error) {
      console.error('Import error:', error);
      toastManager.error('Failed to import figures');
    }
  };

  const showSection = (section: string) => !activeSection || activeSection === section;

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Beta Guide */}
        {showSection('general') && <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Beta Testing</h2>
          <p className="mb-4">
            Welcome beta tester! Access the guide for getting started, feature walkthroughs, and how to provide feedback.
          </p>
          <Button
            onClick={() => setCurrentPage('help')}
            variant="outline"
            className="bg-white text-blue-600 hover:bg-gray-100 border-white"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Open Beta Guide
          </Button>
        </div>
      </div>}

      {/* Display Settings */}
      {showSection('general') && <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Display Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize how the app looks
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="h-6 w-6 text-blue-600" />
              ) : (
                <Sun className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <Label htmlFor="darkMode" className="text-lg font-semibold cursor-pointer">
                  Dark Mode
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {darkMode ? 'Dark mode is enabled' : 'Light mode is enabled'}
                </p>
              </div>
            </div>
            <Checkbox
              id="darkMode"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </div>
      </div>}

      {/* Privacy Settings */}
      {showSection('privacy') && <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Privacy Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Control who can see your collection
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {collectionPublic ? (
                <Eye className="h-6 w-6 text-green-600" />
              ) : (
                <EyeOff className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  id="collectionPublic"
                  checked={collectionPublic}
                  onCheckedChange={handleCollectionPrivacyChange}
                />
                <Label htmlFor="collectionPublic" className="text-lg font-semibold cursor-pointer">
                  Make my entire collection public
                </Label>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {collectionPublic ? (
                  <>
                    Your collection is <span className="font-semibold text-green-600">PUBLIC</span>. All your figures are visible to other users in the Browse section.
                  </>
                ) : (
                  <>
                    Your collection is <span className="font-semibold text-gray-600">PRIVATE</span>. Only you can see your figures unless you mark individual figures as public.
                  </>
                )}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  How it works:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Collection public = All figures are visible by default</li>
                  <li>Collection private = Only figures marked as "public" are visible</li>
                  <li>Individual figure settings override collection settings</li>
                  <li>You can mark specific figures as public/private regardless of collection setting</li>
                </ul>
              </div>

              {/* Blocked Users Navigation */}
              <div className="mt-6">
                <button
                  onClick={() => setCurrentPage('blocked')}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldOff className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Blocked Users</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Manage users you've blocked
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* User Reports Navigation (Admin Only) */}
              {currentUser.role && ['management', 'manager'].includes(currentUser.role) && (
                <div className="mt-3">
                  <button
                    onClick={() => setCurrentPage('reports')}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">User Reports</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Review and manage user reports
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const pendingCount = ReportingService.getPendingCount();
                        return pendingCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                            {pendingCount}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>}

      {showSection('privacy') && <div className="mb-8">
        {/* Admirers Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Collection Admirers
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage who can follow and admire your collection
                  </p>
                </div>
              </div>

              {/* Auto-Approve Toggle */}
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoApproveAdmirers"
                    checked={autoApproveAdmirers}
                    onCheckedChange={handleAutoApproveChange}
                  />
                  <Label htmlFor="autoApproveAdmirers" className="cursor-pointer font-semibold text-blue-900 dark:text-blue-200">
                    Auto-approve admirer requests
                  </Label>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-2 ml-6">
                  When enabled, people can automatically become admirers of your collection without your approval.
                </p>
              </div>

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Pending Requests ({pendingRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingRequests.map(request => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {request.profileImage ? (
                              <img
                                src={request.profileImage}
                                alt={request.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {request.displayName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{request.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request.id)}
                            title="Reject request"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                            onClick={() => handleReportAdmirer(request.id, request.displayName)}
                            title="Report user"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleBlockAdmirer(request.id, request.displayName)}
                            title="Block user"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Admirers */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Current Admirers ({admirers.length})
                </h4>
                {admirers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                    No admirers yet. Make your collection public to allow others to admire it!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {admirers.map(admirer => (
                      <div
                        key={admirer.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            {admirer.profileImage ? (
                              <img
                                src={admirer.profileImage}
                                alt={admirer.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {admirer.displayName}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              @{admirer.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                            onClick={() => handleReportAdmirer(admirer.id, admirer.displayName)}
                            title="Report user"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleBlockAdmirer(admirer.id, admirer.displayName)}
                            title="Block user"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => handleRemoveAdmirer(admirer.id)}
                            title="Remove admirer"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* Admin: System Option Requests */}
      {showSection('system') && canManageSystem && systemRequests.length > 0 && (
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Option Requests
              <Mail className="inline h-6 w-6 ml-2 text-orange-600" />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review user requests for new system options ({systemRequests.length} pending)
            </p>
          </div>

          <div className="space-y-3">
            {systemRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.subject.replace('System Option Request: ', '')}
                      </h3>
                      {!request.read && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      From: {request.fromDisplayName}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      {request.message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {new Date(request.timestamp).toLocaleString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewedRequest(request)}
                        className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdatedRequest(request)}
                        className="flex-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Updated
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDenyRequest(request)}
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSection('system') && canManageSystem && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                System Configuration
                <Shield className="inline h-6 w-6 ml-2 text-blue-600" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage system-wide dropdown options (Management Only)
              </p>
            </div>
            <Button onClick={handleResetToDefaults} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <OptionList
          title="Condition Options"
          options={settings.conditionOptions}
          onRemove={handleRemoveCondition}
          newValue={newValues.condition}
          onNewValueChange={(value) => setNewValues({ ...newValues, condition: value })}
          onAdd={handleAddCondition}
        />

        <OptionList
          title="Category Options"
          options={settings.categoryOptions}
          onRemove={handleRemoveCategory}
          newValue={newValues.category}
          onNewValueChange={(value) => setNewValues({ ...newValues, category: value })}
          onAdd={handleAddCategory}
        />

        <OptionList
          title="Manufacturer Options"
          options={settings.manufacturerOptions}
          onRemove={handleRemoveManufacturer}
          newValue={newValues.manufacturer}
          onNewValueChange={(value) => setNewValues({ ...newValues, manufacturer: value })}
          onAdd={handleAddManufacturer}
        />

        <OptionList
          title="Series Options"
          options={settings.seriesOptions}
          onRemove={handleRemoveSeries}
          newValue={newValues.series}
          onNewValueChange={(value) => setNewValues({ ...newValues, series: value })}
          onAdd={handleAddSeries}
        />

        <OptionList
          title="Version Options"
          options={settings.versionOptions}
          onRemove={handleRemoveVersion}
          newValue={newValues.version}
          onNewValueChange={(value) => setNewValues({ ...newValues, version: value })}
          onAdd={handleAddVersion}
        />

        <OptionList
          title="Size Options"
          options={settings.sizeOptions}
          onRemove={handleRemoveSize}
          newValue={newValues.size}
          onNewValueChange={(value) => setNewValues({ ...newValues, size: value })}
          onAdd={handleAddSize}
        />

        <OptionList
          title="Packaging Options"
          options={settings.packagingOptions}
          onRemove={handleRemovePackaging}
          newValue={newValues.packaging}
          onNewValueChange={(value) => setNewValues({ ...newValues, packaging: value })}
          onAdd={handleAddPackaging}
        />
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> These options will appear in dropdown menus when adding or editing figures.
              You can also type custom values directly into text fields even if they're not in these lists.
            </p>
          </div>
        </>
      )}

      {/* Figure Database - Visible to all users */}
      {showSection('system') && <div className="mt-8">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                Figure Database
                <Database className="inline h-6 w-6 ml-2" />
              </h2>
              <p className="text-green-50">
                {isAdminUser ? 'Add figures to the master database that users can reference' : 'Browse the master figure database'}
              </p>
            </div>
            {isAdminUser && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setAddFigureDialogOpen(true)} variant="outline" className="bg-white text-green-600 hover:bg-gray-100 border-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Figure
                </Button>
                <Button onClick={handleImportMasterFigures} variant="outline" className="bg-white text-green-600 hover:bg-gray-100 border-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Figures
                </Button>
                <Button onClick={handleOpenScraper} variant="outline" className="bg-white text-teal-600 hover:bg-gray-100 border-white">
                  <Download className="h-4 w-4 mr-2" />
                  Scrape Figures
                </Button>
                <Button onClick={handleMigrateExistingFigures} variant="outline" className="bg-white text-orange-600 hover:bg-orange-50 border-white">
                  <Database className="h-4 w-4 mr-2" />
                  Migrate Existing
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search Box */}
        {masterFigures.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder="Search figures by name, manufacturer, product line..."
              value={masterFiguresSearch}
              onChange={(e) => {
                setMasterFiguresSearch(e.target.value);
                setMasterFiguresPage(1); // Reset to first page on search
              }}
              className="max-w-md"
            />
          </div>
        )}

        {/* Master Figures List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {masterFigures.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No master figures in the database yet.</p>
              <p className="text-sm mt-1">Add figures individually or import from a JSON file.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Manufacturer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product Line
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sub Product Line
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Added By
                      </th>
                      {isAdminUser && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {masterFigures
                      .filter(figure => {
                        if (!masterFiguresSearch) return true;
                        const search = masterFiguresSearch.toLowerCase();
                        return (
                          figure.name.toLowerCase().includes(search) ||
                          figure.manufacturer.toLowerCase().includes(search) ||
                          (figure.productLine && figure.productLine.toLowerCase().includes(search)) ||
                          (figure.subProductLine && figure.subProductLine.toLowerCase().includes(search)) ||
                          (figure.version && figure.version.toLowerCase().includes(search))
                        );
                      })
                      .slice((masterFiguresPage - 1) * masterFiguresPerPage, masterFiguresPage * masterFiguresPerPage)
                      .map((figure) => (
                        <tr key={figure.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <img
                              src={figure.imageUrl || DEFAULT_FIGURE_IMAGE}
                              alt={figure.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {figure.name}
                                </div>
                                {figure.version && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {figure.version}
                                  </div>
                                )}
                              </div>
                              {figure.sourceUrl && (
                                <a
                                  href={figure.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="View source"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {figure.manufacturer}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {figure.productLine || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {figure.subProductLine || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                figure.source === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                figure.source === 'import' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {figure.source === 'admin' ? 'Admin' : figure.source === 'import' ? 'Import' : 'User'}
                              </span>
                              {figure.sourceName && (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {figure.sourceName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {figure.createdByName || 'Unknown'}
                          </td>
                          {isAdminUser && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={() => handleEditMasterFigure(figure)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => handleDeleteMasterFigure(figure.id, figure.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {(() => {
                const filteredFigures = masterFigures.filter(figure => {
                  if (!masterFiguresSearch) return true;
                  const search = masterFiguresSearch.toLowerCase();
                  return (
                    figure.name.toLowerCase().includes(search) ||
                    figure.manufacturer.toLowerCase().includes(search) ||
                    (figure.productLine && figure.productLine.toLowerCase().includes(search)) ||
                    (figure.subProductLine && figure.subProductLine.toLowerCase().includes(search)) ||
                    (figure.version && figure.version.toLowerCase().includes(search))
                  );
                });
                const totalPages = Math.ceil(filteredFigures.length / masterFiguresPerPage);

                return (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {filteredFigures.length === 0 ? 0 : ((masterFiguresPage - 1) * masterFiguresPerPage) + 1} to {Math.min(masterFiguresPage * masterFiguresPerPage, filteredFigures.length)} of {filteredFigures.length} figures
                      {masterFiguresSearch && ` (filtered from ${masterFigures.length} total)`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMasterFiguresPage(p => Math.max(1, p - 1))}
                        disabled={masterFiguresPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current
                            return page === 1 || page === totalPages || Math.abs(page - masterFiguresPage) <= 1;
                          })
                          .map((page, idx, arr) => (
                            <>
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span key={`ellipsis-${page}`} className="px-2 text-gray-500">...</span>
                              )}
                              <Button
                                key={page}
                                size="sm"
                                variant={masterFiguresPage === page ? 'default' : 'outline'}
                                onClick={() => setMasterFiguresPage(page)}
                                className="min-w-[2.5rem]"
                              >
                                {page}
                              </Button>
                            </>
                          ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMasterFiguresPage(p => Math.min(totalPages, p + 1))}
                        disabled={masterFiguresPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-sm text-green-900 dark:text-green-100">
            <strong>Note:</strong> Figures in this database serve as reference templates.{' '}
            {isAdminUser ? 'Figures added here appear in the master database but don\'t automatically add to user collections.' : 'You can view all figures that have been added by users and administrators.'}
          </p>
        </div>
      </div>}

      {/* Custom Fields Management */}
      {showSection('customFields') && <div className={canManageSystem ? 'mt-8 pt-8 border-t border-gray-200 dark:border-gray-700' : ''}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Custom Fields
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create custom fields specific to your collection
          </p>
        </div>
        <CustomFieldsManager fields={settings.customFields} onFieldsChange={loadSettings} />

        {/* Request System Options Button */}
        {!canManageSystem && (
          <div className="mt-6">
            <Button
              onClick={() => setRequestDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Request New System Option
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Don't see an option you need? Send a request to administrators.
            </p>
          </div>
        )}
      </div>}

      {showSection('customFields') && currentUser.role === 'management' && (
        <div>
          {/* Admin-only: All Users' Custom Fields */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <AdminCustomFieldsManager onFieldsChange={loadSettings} />
          </div>
        </div>
      )}

      {/* Value Migration Dialog */}
      {migrationDialog && (
        <ValueMigrationDialog
          field={migrationDialog.field}
          fieldLabel={migrationDialog.fieldLabel}
          valueToRemove={migrationDialog.value}
          availableValues={migrationDialog.availableValues}
          onClose={() => setMigrationDialog(null)}
          onMigrate={handleMigration}
        />
      )}

      {/* Block Reason Dialog */}
      {userToBlock && (
        <BlockReasonDialog
          isOpen={blockDialogOpen}
          username={userToBlock.username}
          onConfirm={confirmBlock}
          onCancel={cancelBlock}
        />
      )}

      {/* Report Reason Dialog */}
      {userToReport && (
        <ReportReasonDialog
          isOpen={reportDialogOpen}
          username={userToReport.username}
          onConfirm={confirmReport}
          onCancel={cancelReport}
        />
      )}

      {/* Request System Option Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request System Option</DialogTitle>
            <DialogDescription>
              Request an administrator to add a new option to the system dropdown menus
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldType">Field Type</Label>
              <select
                id="fieldType"
                value={requestForm.fieldType}
                onChange={(e) => setRequestForm({ ...requestForm, fieldType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
              >
                <option value="condition">Condition</option>
                <option value="category">Category</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="series">Series</option>
                <option value="version">Version</option>
                <option value="size">Size</option>
                <option value="packaging">Packaging</option>
              </select>
            </div>

            <div>
              <Label htmlFor="optionValue">Option Value *</Label>
              <Input
                id="optionValue"
                placeholder="e.g., Mint, DC Comics, 1:12 Scale"
                value={requestForm.optionValue}
                onChange={(e) => setRequestForm({ ...requestForm, optionValue: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why do you need this option?"
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleRequestOption} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Send Request
              </Button>
              <Button
                onClick={() => {
                  setRequestDialogOpen(false);
                  setRequestForm({ fieldType: 'condition', optionValue: '', reason: '' });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deny Request Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={cancelDenyRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deny System Option Request</DialogTitle>
            <DialogDescription>
              Provide a reason for denying this request. The user will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Request: {selectedRequest.subject.replace('System Option Request: ', '')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  From: {selectedRequest.fromDisplayName}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="denyReason">Reason for Denial *</Label>
              <Textarea
                id="denyReason"
                placeholder="e.g., This option is too specific, already exists as..., doesn't fit system categories"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                className="mt-1"
                rows={4}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={confirmDenyRequest}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <X className="h-4 w-4 mr-2" />
                Deny & Notify User
              </Button>
              <Button
                onClick={cancelDenyRequest}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Master Figure Dialog */}
      <Dialog open={addFigureDialogOpen} onOpenChange={setAddFigureDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Master Figure</DialogTitle>
            <DialogDescription>
              Add a new figure to the master database that users can reference
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="figureName">Name *</Label>
                <Input
                  id="figureName"
                  placeholder="e.g., Snake Eyes"
                  value={newMasterFigure.name}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="figureVersion">Version</Label>
                <select
                  id="figureVersion"
                  value={newMasterFigure.version}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                >
                  <option value="">Select version...</option>
                  {settings.versionOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="figureManufacturer">Manufacturer *</Label>
                <select
                  id="figureManufacturer"
                  value={newMasterFigure.manufacturer}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                >
                  <option value="">Select manufacturer...</option>
                  {settings.manufacturerOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="figureCategory">Category</Label>
                <select
                  id="figureCategory"
                  value={newMasterFigure.category}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                >
                  <option value="">Select category...</option>
                  {settings.categoryOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="figureYear">Year</Label>
                <Input
                  id="figureYear"
                  type="number"
                  placeholder="e.g., 2020"
                  value={newMasterFigure.year}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, year: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="figureSize">Size</Label>
                <select
                  id="figureSize"
                  value={newMasterFigure.size}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                >
                  <option value="">Select size...</option>
                  {settings.sizeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="figurePackaging">Packaging</Label>
                <select
                  id="figurePackaging"
                  value={newMasterFigure.packaging}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, packaging: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                >
                  <option value="">Select packaging...</option>
                  {settings.packagingOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="figureProductLine">Product Line *</Label>
                <Input
                  id="figureProductLine"
                  placeholder="e.g., Classified Series"
                  value={newMasterFigure.productLine}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, productLine: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="figureSubProductLine">Sub Product Line</Label>
                <Input
                  id="figureSubProductLine"
                  placeholder="e.g., Wave 1"
                  value={newMasterFigure.subProductLine}
                  onChange={(e) => setNewMasterFigure({ ...newMasterFigure, subProductLine: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="figureImageUrl">Image URL (optional)</Label>
              <Input
                id="figureImageUrl"
                placeholder="https://... or leave blank for default image"
                value={newMasterFigure.imageUrl}
                onChange={(e) => setNewMasterFigure({ ...newMasterFigure, imageUrl: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If left blank, a default placeholder image will be used
              </p>
            </div>

            <div>
              <Label htmlFor="figureNotes">Notes</Label>
              <Textarea
                id="figureNotes"
                placeholder="Additional information about this figure..."
                value={newMasterFigure.notes}
                onChange={(e) => setNewMasterFigure({ ...newMasterFigure, notes: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="figureSourceName">Source Name</Label>
              <Input
                id="figureSourceName"
                placeholder="e.g., YoJoe.com, Hasbro Pulse, eBay"
                value={newMasterFigure.sourceName}
                onChange={(e) => setNewMasterFigure({ ...newMasterFigure, sourceName: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional: Where this figure data came from
              </p>
            </div>

            <div>
              <Label htmlFor="figureSourceUrl">Source URL</Label>
              <Input
                id="figureSourceUrl"
                placeholder="https://www.yojoe.com/action/82/..."
                value={newMasterFigure.sourceUrl}
                onChange={(e) => setNewMasterFigure({ ...newMasterFigure, sourceUrl: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional: Link to original figure page
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddMasterFigure} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Add Figure
              </Button>
              <Button
                onClick={() => {
                  setAddFigureDialogOpen(false);
                  setNewMasterFigure({
                    name: '',
                    version: '',
                    year: '',
                    series: '',
                    manufacturer: '',
                    category: '',
                    size: '',
                    productLine: '',
                    subProductLine: '',
                    packaging: '',
                    imageUrl: '',
                    notes: '',
                    sourceName: '',
                    sourceUrl: ''
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Master Figure Dialog */}
      <Dialog open={editFigureDialogOpen} onOpenChange={setEditFigureDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Master Figure</DialogTitle>
            <DialogDescription>
              Update the figure details in the master database
            </DialogDescription>
          </DialogHeader>

          {editingFigure && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFigureName">Name *</Label>
                  <Input
                    id="editFigureName"
                    placeholder="e.g., Snake Eyes"
                    value={editingFigure.name}
                    onChange={(e) => setEditingFigure({ ...editingFigure, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="editFigureVersion">Version</Label>
                  <select
                    id="editFigureVersion"
                    value={editingFigure.version || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                  >
                    <option value="">Select version...</option>
                    {settings.versionOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editFigureManufacturer">Manufacturer *</Label>
                  <select
                    id="editFigureManufacturer"
                    value={editingFigure.manufacturer}
                    onChange={(e) => setEditingFigure({ ...editingFigure, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                  >
                    <option value="">Select manufacturer...</option>
                    {settings.manufacturerOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editFigureCategory">Category</Label>
                  <select
                    id="editFigureCategory"
                    value={editingFigure.category}
                    onChange={(e) => setEditingFigure({ ...editingFigure, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                  >
                    <option value="">Select category...</option>
                    {settings.categoryOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editFigureYear">Year</Label>
                  <Input
                    id="editFigureYear"
                    type="number"
                    placeholder="e.g., 2020"
                    value={editingFigure.year || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, year: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="editFigureSize">Size</Label>
                  <select
                    id="editFigureSize"
                    value={editingFigure.size || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                  >
                    <option value="">Select size...</option>
                    {settings.sizeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editFigurePackaging">Packaging</Label>
                  <select
                    id="editFigurePackaging"
                    value={editingFigure.packaging || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, packaging: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                  >
                    <option value="">Select packaging...</option>
                    {settings.packagingOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editFigureProductLine">Product Line *</Label>
                  <Input
                    id="editFigureProductLine"
                    placeholder="e.g., Classified Series"
                    value={editingFigure.productLine || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, productLine: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="editFigureSubProductLine">Sub Product Line</Label>
                  <Input
                    id="editFigureSubProductLine"
                    placeholder="e.g., Wave 1"
                    value={editingFigure.subProductLine || ''}
                    onChange={(e) => setEditingFigure({ ...editingFigure, subProductLine: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editFigureImageUrl">Image URL (optional)</Label>
                <Input
                  id="editFigureImageUrl"
                  placeholder="https://... or leave blank for default image"
                  value={editingFigure.imageUrl || ''}
                  onChange={(e) => setEditingFigure({ ...editingFigure, imageUrl: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If left blank, a default placeholder image will be used
                </p>
              </div>

              <div>
                <Label htmlFor="editFigureNotes">Notes</Label>
                <Textarea
                  id="editFigureNotes"
                  placeholder="Additional information about this figure..."
                  value={editingFigure.notes || ''}
                  onChange={(e) => setEditingFigure({ ...editingFigure, notes: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="editFigureSourceName">Source Name</Label>
                <Input
                  id="editFigureSourceName"
                  placeholder="e.g., YoJoe.com, Hasbro Pulse, eBay"
                  value={editingFigure.sourceName || ''}
                  onChange={(e) => setEditingFigure({ ...editingFigure, sourceName: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Optional: Where this figure data came from
                </p>
              </div>

              <div>
                <Label htmlFor="editFigureSourceUrl">Source URL</Label>
                <Input
                  id="editFigureSourceUrl"
                  placeholder="https://www.yojoe.com/action/82/..."
                  value={editingFigure.sourceUrl || ''}
                  onChange={(e) => setEditingFigure({ ...editingFigure, sourceUrl: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Optional: Link to original figure page
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveEditedFigure} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setEditFigureDialogOpen(false);
                    setEditingFigure(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scraper Dialog */}
      <Dialog open={scraperDialogOpen} onOpenChange={setScraperDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scrape Figures from External Sources</DialogTitle>
            <DialogDescription>
              Automatically extract figure data from websites, databases, or CSV files
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scraper Selection */}
            <div>
              <Label htmlFor="scraper-select">Select Scraper</Label>
              <select
                id="scraper-select"
                value={selectedScraperId}
                onChange={(e) => setSelectedScraperId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1"
                disabled={scraping}
              >
                <option value="">Choose a scraper...</option>
                {getScraperConfigs().map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name} - {config.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Field */}
            {selectedScraperId && getScraperById(selectedScraperId)?.config.requiresInput && (
              <div>
                <Label htmlFor="scraper-input">Input</Label>
                <Textarea
                  id="scraper-input"
                  placeholder={getScraperById(selectedScraperId)?.config.inputPlaceholder || 'Enter data...'}
                  value={scraperInput}
                  onChange={(e) => setScraperInput(e.target.value)}
                  rows={6}
                  className="mt-1 font-mono text-sm"
                  disabled={scraping}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Paste CSV data or enter a URL to scrape
                </p>
              </div>
            )}

            {/* Run Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleRunScraper}
                disabled={scraping || !selectedScraperId}
                className="flex-1"
              >
                {scraping ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Scraping...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Run Scraper
                  </>
                )}
              </Button>
              <Button
                onClick={() => setScraperDialogOpen(false)}
                variant="outline"
                disabled={scraping}
              >
                Cancel
              </Button>
            </div>

            {/* Errors */}
            {scrapeErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Errors:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {scrapeErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Results Preview */}
            {scrapedData.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Found {scrapedData.length} figures
                  </h4>
                  <Button onClick={handleImportScrapedData}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import All
                  </Button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Manufacturer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product Line
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Year
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {scrapedData.map((figure, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {figure.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            {figure.manufacturer || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            {figure.productLine || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            {figure.year || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    💡 Preview the data above. Click "Import All" to add these figures to the master database. Duplicates will be automatically skipped.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
