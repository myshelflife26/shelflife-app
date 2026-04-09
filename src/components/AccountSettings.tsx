import { useState, useEffect } from 'react';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { toastManager } from '../utils/toastManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import type { User as UserType } from '../types/user';

interface AccountSettingsProps {
  currentUser: UserType;
  onUserUpdate: () => void;
}

export function AccountSettings({ currentUser, onUserUpdate }: AccountSettingsProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [email, setEmail] = useState(currentUser.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(currentUser.displayName);
    setEmail(currentUser.email || '');
  }, [currentUser]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      toastManager.error('Display name cannot be empty');
      return;
    }

    if (displayName === currentUser.displayName) {
      toastManager.info('No changes to save');
      return;
    }

    setSavingDisplayName(true);
    try {
      await FirebaseAuthService.updateDisplayName(currentUser.id, displayName.trim());
      toastManager.success('Display name updated');
      onUserUpdate();
    } catch (error) {
      console.error('Failed to update display name:', error);
      toastManager.error('Failed to update display name');
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      toastManager.error('Email cannot be empty');
      return;
    }

    if (email === currentUser.email) {
      toastManager.info('No changes to save');
      return;
    }

    setSavingEmail(true);
    try {
      await FirebaseAuthService.updateUserEmail(currentUser.id, email.trim());
      toastManager.success('Email updated');
      onUserUpdate();
    } catch (error) {
      console.error('Failed to update email:', error);
      toastManager.error('Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toastManager.error('Please enter your current password');
      return;
    }

    if (!newPassword) {
      toastManager.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 4) {
      toastManager.error('Password must be at least 4 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastManager.error('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      toastManager.error('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      await FirebaseAuthService.changePassword(currentPassword, newPassword);
      toastManager.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.message === 'Current password is incorrect') {
        toastManager.error('Current password is incorrect');
      } else {
        toastManager.error('Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account information and password
        </p>
      </div>

      {/* Username (Read-only) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Username</h3>
        </div>
        <div>
          <Label htmlFor="username">Username (cannot be changed)</Label>
          <Input
            id="username"
            type="text"
            value={currentUser.username}
            disabled
            className="bg-gray-50 dark:bg-gray-900 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Display Name */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Display Name</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
          <Button
            onClick={handleSaveDisplayName}
            disabled={savingDisplayName || displayName === currentUser.displayName}
          >
            {savingDisplayName ? 'Saving...' : 'Save Display Name'}
          </Button>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Address</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>
          <Button
            onClick={handleSaveEmail}
            disabled={savingEmail || email === currentUser.email}
          >
            {savingEmail ? 'Saving...' : 'Save Email'}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </div>
  );
}
