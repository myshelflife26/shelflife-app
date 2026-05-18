import { useState, useEffect, useRef, useMemo } from 'react';
import { FirebaseAuthService } from '../utils/firebaseAuth';
import type { User, UserRole } from '../types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Users, Plus, Pencil, Trash2, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';
import { Pagination } from './Pagination';

interface UserManagementPageProps {
  currentUser: User;
}

export function UserManagementPage({ currentUser }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    email: '',
    role: 'user' as UserRole
  });
  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [paginationPage, setPaginationPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteOptions, setDeleteOptions] = useState({
    deleteReactions: false,
    deleteTrades: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await FirebaseAuthService.getAllUsers();
    setUsers(allUsers);
  };

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (paginationPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return users.slice(startIndex, endIndex);
  }, [users, paginationPage, pageSize]);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      email: '',
      role: 'user'
    });
    setError('');
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      displayName: user.displayName,
      email: user.email || '',
      role: user.role
    });
    setError('');
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    setError('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }

    // Password validation for new users or when changing password
    if (!editingUser || formData.password) {
      if (!formData.password) {
        setError('Password is required');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 4) {
        setError('Password must be at least 4 characters long');
        return;
      }
    }

    if (editingUser) {
      // Update existing user
      const updates: Partial<Omit<User, 'id' | 'password'>> = {
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email || undefined,
        role: formData.role
      };

      // Note: Firebase doesn't support password updates through updateUser
      // Password changes require re-authentication
      if (formData.password) {
        setError('Password updates are not supported yet. Please create a new user instead.');
        return;
      }

      const result = await FirebaseAuthService.updateUser(editingUser.id, updates);

      if (!result.success) {
        setError(result.error || 'Failed to update user');
        return;
      }
    } else {
      // Create new user
      const result = await FirebaseAuthService.createUser(
        formData.username,
        formData.password,
        formData.displayName,
        formData.role,
        formData.email || undefined
      );

      if (!result.success) {
        setError(result.error || 'Failed to create user');
        return;
      }
    }

    await loadUsers();
    handleClose();
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own account');
      return;
    }

    setUserToDelete(user);
    setDeleteOptions({ deleteReactions: false, deleteTrades: false });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    const result = await FirebaseAuthService.deleteUser(userToDelete.id, deleteOptions);

    if (!result.success) {
      alert(result.error || 'Failed to delete user');
      return;
    }

    setDeleteDialogOpen(false);
    setUserToDelete(null);
    await loadUsers();
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setDeleteOptions({ deleteReactions: false, deleteTrades: false });
  };

  // Check if current user is admin
  if (currentUser.role !== 'management') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access user management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage user accounts
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Pagination Top */}
        <div className="mb-4">
          <Pagination
            currentPage={paginationPage}
            totalItems={users.length}
            pageSize={pageSize}
            onPageChange={setPaginationPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow overflow-hidden">
          <div ref={scrollContainerRef} className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ minWidth: '800px' }}>
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.displayName}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        ID: {user.id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {user.username}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.role === 'management' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </span>
                  ) : user.role === 'manager' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      Manager
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      User
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEdit(user)}
                      className="h-8 w-8"
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(user)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete user"
                      disabled={user.id === currentUser.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>

        {/* Pagination Bottom */}
        <div className="mt-4">
          <Pagination
            currentPage={paginationPage}
            totalItems={users.length}
            pageSize={pageSize}
            onPageChange={setPaginationPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Create/Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information. Leave password blank to keep current password.'
                : 'Create a new user account with username, password, and role.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g., johndoe"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 3 characters, used for login
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used for notifications (e.g., pending deletions)
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password {!editingUser && '*'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Leave blank to keep current' : 'Minimum 4 characters'}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password {!editingUser && '*'}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="management">Admin (Management)</option>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                User: Basic access • Manager: System settings • Admin: Full access + user management
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              {userToDelete && (
                <>
                  You are about to permanently delete <strong>{userToDelete.displayName}</strong> (@{userToDelete.username}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What will be deleted */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                ✓ Always Deleted:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• User account & profile</li>
                <li>• Personal figures collection</li>
                <li>• Personal notifications</li>
                <li>• Shelves & wishlist</li>
                <li>• Admirer relationships & requests</li>
                <li>• Comment reports</li>
              </ul>
            </div>

            {/* What will be preserved */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                ✓ Always Preserved (Historical Data):
              </h4>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 ml-4">
                <li>• Comments (anonymized as [Deleted User])</li>
                <li>• Messages (anonymized as [Deleted User])</li>
                <li>• User ratings (affects other users)</li>
              </ul>
            </div>

            {/* Optional deletions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Optional (Choose):
              </h4>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOptions.deleteReactions}
                  onChange={(e) => setDeleteOptions({ ...deleteOptions, deleteReactions: e.target.checked })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Delete reactions
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Remove all likes/loves/fire reactions they gave to figures. This will affect reaction counts on other users' figures.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOptions.deleteTrades}
                  onChange={(e) => setDeleteOptions({ ...deleteOptions, deleteTrades: e.target.checked })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Delete trade history
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Remove all trade records involving this user. This will affect other users' trade history.
                  </div>
                </div>
              </label>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-200">
                This action cannot be undone. The user's personal data will be permanently deleted.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={confirmDelete}
                variant="default"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
              <Button
                onClick={cancelDelete}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
