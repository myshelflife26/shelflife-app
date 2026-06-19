import { useState } from 'react';
import type { User } from '../types/user';
import { SettingsPage } from './SettingsPage';
import { AccountSettings } from './AccountSettings';
import UserManagementPage from './UserManagementPage';
import { MasterFiguresDatabasePage } from './MasterFiguresDatabasePage';
import { SystemMaintenance } from './SystemMaintenance';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { Settings, User as UserIcon, Shield, Wrench, Lock, Eye, Database } from 'lucide-react';
import { Button } from './ui/button';

interface TabbedSettingsPageProps {
  currentUser: User;
  setCurrentPage: (page: any) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

type TabType = 'general' | 'privacy' | 'account' | 'customFields' | 'database' | 'system' | 'users';

export function TabbedSettingsPage({ currentUser, setCurrentPage, darkMode, setDarkMode }: TabbedSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const isAdmin = currentUser.role === 'management';

  // Debug logging for user role issues
  console.log('[TabbedSettingsPage] Current user:', {
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role,
    isAdmin: isAdmin
  });

  const handleFixAdminRole = async () => {
    if (!confirm('Fix ackpack34 role to management? This will update the database.')) {
      return;
    }

    try {
      // Update user role directly in Firestore
      console.log('Updating user role for:', currentUser.id);
      console.log('Current user object:', currentUser);
      console.log('About to call updateUser with role: management');

      const result = await FirebaseAuthService.updateUser(currentUser.id, { role: 'management' });
      console.log('UpdateUser result:', result);

      if (result.success) {
        console.log('Role update successful!');

        // Wait a moment for Firestore to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the update by fetching fresh user data
        console.log('Fetching fresh user data to verify update...');
        const updatedUser = await FirebaseAuthService.getUserById(currentUser.id);
        console.log('Fresh user data from database:', updatedUser);

        if (updatedUser?.role === 'management') {
          alert('✅ Role successfully updated in database! \n\nThe role is now "management" in Firestore. \n\nTry these steps:\n1. Open a new incognito/private browser window\n2. Go to your app URL\n3. Login as ackpack34\n4. Check Settings - you should see admin tabs');
        } else {
          console.error('Role mismatch - expected management, got:', updatedUser?.role);
          alert(`⚠️ Update seemed successful but verification failed!\n\nExpected: management\nActual: ${updatedUser?.role || 'unknown'}\n\nThere may be a Firestore permissions issue. Check console for details.`);
        }
      } else {
        console.error('Role update failed:', result.error);
        alert('❌ Failed to update role: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('❌ Failed to update role. Check console for details.');
    }
  };

  const handleManualVerify = async () => {
    try {
      const freshUser = await FirebaseAuthService.getUserById(currentUser.id);
      alert(`Current role in database: ${freshUser?.role || 'unknown'}\n\nIf this shows 'management', try opening an incognito window and logging in fresh.`);
    } catch (error) {
      alert('Error checking database: ' + error);
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: Settings, adminOnly: false },
    { id: 'privacy' as TabType, label: 'Privacy', icon: Eye, adminOnly: false },
    { id: 'account' as TabType, label: 'Account', icon: UserIcon, adminOnly: false },
    { id: 'customFields' as TabType, label: 'Custom Fields', icon: Wrench, adminOnly: false },
    { id: 'system' as TabType, label: 'Maintenance', icon: Shield, adminOnly: false },
    { id: 'database' as TabType, label: 'Database', icon: Database, adminOnly: true },
    { id: 'users' as TabType, label: 'User Management', icon: Lock, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full box-border">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account, privacy, and application settings
        </p>

        {/* Debug info for admin access issues */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
          <div><strong>Debug Info:</strong></div>
          <div>User: {currentUser.username} (ID: {currentUser.id})</div>
          <div>Role: {currentUser.role}</div>
          <div>Is Admin: {isAdmin ? 'YES' : 'NO'}</div>
          <div>Visible Tabs: {visibleTabs.length} of {tabs.length}</div>
          <div>Admin Tabs: {visibleTabs.filter(tab => tab.adminOnly).map(tab => tab.label).join(', ') || 'None'}</div>

          {currentUser.username === 'ackpack34' && currentUser.role !== 'management' && (
            <div className="mt-3">
              <div className="text-red-600 dark:text-red-400 font-semibold mb-2">
                ⚠️ Issue: ackpack34 should have 'management' role but has '{currentUser.role}'
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                This will update Firestore. If successful, use incognito mode to test with fresh login.
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleFixAdminRole}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  🔧 Fix Admin Role
                </Button>
                <Button
                  onClick={handleManualVerify}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  🔍 Check Database
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto mb-6">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && (
          <SettingsPage
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            activeSection="general"
          />
        )}
        {activeTab === 'privacy' && (
          <SettingsPage
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            activeSection="privacy"
          />
        )}
        {activeTab === 'account' && (
          <AccountSettings
            currentUser={currentUser}
            onUserUpdate={async () => {
              const updatedUser = await FirebaseAuthService.getCurrentUser();
              if (updatedUser) {
                // Update parent state - this will be handled by App.tsx
                window.location.reload();
              }
            }}
          />
        )}
        {activeTab === 'customFields' && (
          <SettingsPage
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            activeSection="customFields"
          />
        )}
        {activeTab === 'system' && (
          <SystemMaintenance currentUser={currentUser} />
        )}
        {activeTab === 'database' && isAdmin && (
          <MasterFiguresDatabasePage currentUser={currentUser} />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserManagementPage currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

export default TabbedSettingsPage;
