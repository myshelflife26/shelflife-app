import { useState } from 'react';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { User } from '../types/user';
import { UserPlus, LogIn } from 'lucide-react';
import { Logo } from './Logo';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setEmail('');
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode: 'login' | 'register') => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      // Clear any existing Firebase session before login to prevent user bleed
      console.log('[LOGIN] Clearing existing Firebase session before login');
      await FirebaseAuthService.logout();

      // Small delay to ensure logout completes
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = await FirebaseAuthService.login(trimmedUsername, password);

      if (user) {
        onLogin(user);
      } else {
        setError('Invalid username or password');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!username || !password || !displayName) {
      setError('All fields are required');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long');
      return;
    }

    try {
      const trimmedUsername = username.trim();
      const trimmedDisplayName = displayName.trim();
      const trimmedEmail = email?.trim();

      // Create the user account (always as regular user, not management)
      const result = await FirebaseAuthService.createUser(trimmedUsername, password, trimmedDisplayName, 'user', trimmedEmail || undefined);

      if (!result.success) {
        setError(result.error || 'Failed to create account');
        return;
      }

      // Success - automatically log in the new user
      setSuccess('Account created successfully! Logging you in...');
      setTimeout(async () => {
        const user = await FirebaseAuthService.login(trimmedUsername, password);
        if (user) {
          onLogin(user);
        }
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <Logo size="xl" showTagline={true} className="mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {mode === 'login' ? 'Sign in to manage your collection' : 'Create your account to get started'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={mode === 'login' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => switchMode('login')}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            <Button
              type="button"
              variant={mode === 'register' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => switchMode('register')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>

          {mode === 'login' ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="mt-1"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </form>
          ) : (
            // Registration Form
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <Label htmlFor="reg-username">Username *</Label>
                <Input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="mt-1"
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 3 characters
                </p>
              </div>

              <div>
                <Label htmlFor="reg-displayName">Display Name *</Label>
                <Input
                  id="reg-displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reg-email">Email (Optional)</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For notifications only
                </p>
              </div>

              <div>
                <Label htmlFor="reg-password">Password *</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  className="mt-1"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 4 characters
                </p>
              </div>

              <div>
                <Label htmlFor="reg-confirmPassword">Confirm Password *</Label>
                <Input
                  id="reg-confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!!success}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </form>
          )}

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Session Management:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sessions expire after 24 hours of inactivity</li>
                <li>Logging in again will create a new session</li>
                <li>Same browser: New login invalidates old tabs</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track, organize & connect with collectors
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Free to start · 100 figures included
          </p>
        </div>
      </div>
    </div>
  );
}
