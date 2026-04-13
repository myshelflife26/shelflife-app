import { useState } from 'react';
import type { User } from '../types/user';
import { SettingsPage } from './SettingsPage';
import { AccountSettings } from './AccountSettings';
import { UserManagementPage } from './UserManagementPage';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { Settings, User as UserIcon, Shield, Wrench, Lock, Eye } from 'lucide-react';

interface TabbedSettingsPageProps {
  currentUser: User;
  setCurrentPage: (page: any) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

type TabType = 'general' | 'privacy' | 'account' | 'customFields' | 'system' | 'users';

export function TabbedSettingsPage({ currentUser, setCurrentPage, darkMode, setDarkMode }: TabbedSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const isAdmin = currentUser.role === 'management';

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: Settings, adminOnly: false },
    { id: 'privacy' as TabType, label: 'Privacy', icon: Eye, adminOnly: false },
    { id: 'account' as TabType, label: 'Account', icon: UserIcon, adminOnly: false },
    { id: 'customFields' as TabType, label: 'Custom Fields', icon: Wrench, adminOnly: false },
    { id: 'system' as TabType, label: 'System', icon: Shield, adminOnly: true },
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
        {activeTab === 'system' && isAdmin && (
          <SettingsPage
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            activeSection="system"
          />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserManagementPage currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
