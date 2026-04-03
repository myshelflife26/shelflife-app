import { useState, useEffect } from 'react';
import { Storage } from '../utils/storage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, TrendingUp, Package, DollarSign } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  joinDate: string;
}

const USER_PROFILE_KEY = 'user-profile';

export function UsersPage() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    return stored ? JSON.parse(stored) : {
      name: '',
      email: '',
      joinDate: new Date().toISOString().split('T')[0]
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const figures = Storage.getAll();

  // Calculate statistics
  const stats = {
    totalFigures: figures.length,
    totalValue: figures.reduce((sum, f) => sum + f.currentValue, 0),
    averageValue: figures.length > 0 ? figures.reduce((sum, f) => sum + f.currentValue, 0) / figures.length : 0,
    byCondition: {
      MIB: figures.filter(f => f.condition === 'MIB').length,
      Loose: figures.filter(f => f.condition === 'Loose').length,
      Custom: figures.filter(f => f.condition === 'Custom').length,
    },
    manufacturers: [...new Set(figures.map(f => f.manufacturer))].length,
    series: [...new Set(figures.map(f => f.series))].length,
  };

  const handleSaveProfile = () => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    setIsEditing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        User Profile & Statistics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </h3>
              {!isEditing && (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    Save
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-gray-900 dark:text-white">
                    {profile.name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">
                    {profile.email || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(profile.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Figures */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Figures</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.totalFigures}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </div>

            {/* Total Value */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    ${stats.totalValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </div>

            {/* Average Value */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average Value</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    ${stats.averageValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </div>

            {/* Manufacturers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manufacturers</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.manufacturers}
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <Package className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Condition Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Collection by Condition
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">MIB (Mint in Box)</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats.totalFigures > 0 ? (stats.byCondition.MIB / stats.totalFigures) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {stats.byCondition.MIB}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Loose</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats.totalFigures > 0 ? (stats.byCondition.Loose / stats.totalFigures) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {stats.byCondition.Loose}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Custom</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${stats.totalFigures > 0 ? (stats.byCondition.Custom / stats.totalFigures) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {stats.byCondition.Custom}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
