/**
 * Admin User Modal Component
 * Detailed user management modal for administrators
 */

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Key, 
  Upload, 
  Activity,
  Edit,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: string;
  user_tier: string;
  has_gemini_key: boolean;
  daily_uploads_count: number;
  last_upload_date: string | null;
  created_at: string;
  updated_at: string;
  total_interactions?: number;
  last_activity?: string;
}

interface AdminUserModalProps {
  user: UserData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (userId: string, updates: Partial<UserData>) => Promise<void>;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function AdminUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onUpdateUser, 
  onError, 
  onSuccess 
}: AdminUserModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      
      const updates: Partial<UserData> = {};
      if (editedUser.role !== user.role) updates.role = editedUser.role;
      if (editedUser.user_tier !== user.user_tier) updates.user_tier = editedUser.user_tier;
      
      if (Object.keys(updates).length > 0) {
        await onUpdateUser(user.id, updates);
        onSuccess?.('User updated successfully');
      }
      
      setIsEditing(false);
    } catch (error) {
      onError?.('Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-gold-100 text-gold-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-bolt-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-bolt-blue-100 rounded-lg">
                <User className="h-6 w-6 text-bolt-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-bolt-gray-900">User Details</h2>
                <p className="text-sm text-bolt-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-bolt-blue-600 hover:bg-bolt-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex items-center space-x-2 px-3 py-2 bg-bolt-blue-600 text-white rounded-lg hover:bg-bolt-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isUpdating ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedUser(user);
                    }}
                    className="px-3 py-2 text-bolt-gray-600 hover:bg-bolt-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-bolt-gray-400 hover:text-bolt-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </label>
                    <p className="text-sm text-bolt-gray-900 bg-bolt-gray-50 p-3 rounded-lg">{user.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">
                      <User className="h-4 w-4 inline mr-2" />
                      User ID
                    </label>
                    <p className="text-sm text-bolt-gray-900 bg-bolt-gray-50 p-3 rounded-lg font-mono">{user.id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-2">
                      <Shield className="h-4 w-4 inline mr-2" />
                      Role
                    </label>
                    {isEditing ? (
                      <select
                        value={editedUser.role}
                        onChange={(e) => setEditedUser(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-2">
                      <BarChart3 className="h-4 w-4 inline mr-2" />
                      Tier
                    </label>
                    {isEditing ? (
                      <select
                        value={editedUser.user_tier}
                        onChange={(e) => setEditedUser(prev => ({ ...prev, user_tier: e.target.value }))}
                        className="w-full px-3 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTierColor(user.user_tier)}`}>
                        {user.user_tier}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Dates */}
              <div>
                <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Account Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bolt-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-bolt-gray-600" />
                      <span className="text-sm font-medium text-bolt-gray-700">Created</span>
                    </div>
                    <span className="text-sm text-bolt-gray-900">{formatDate(user.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-bolt-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-bolt-gray-600" />
                      <span className="text-sm font-medium text-bolt-gray-700">Last Updated</span>
                    </div>
                    <span className="text-sm text-bolt-gray-900">{formatDate(user.updated_at)}</span>
                  </div>
                  
                  {user.last_activity && (
                    <div className="flex items-center justify-between p-3 bg-bolt-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-bolt-gray-600" />
                        <span className="text-sm font-medium text-bolt-gray-700">Last Activity</span>
                      </div>
                      <span className="text-sm text-bolt-gray-900">{formatDate(user.last_activity)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Upload className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900">{user.daily_uploads_count}</p>
                    <p className="text-sm text-blue-700">Uploads Today</p>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Activity className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">{user.total_interactions || 0}</p>
                    <p className="text-sm text-purple-700">Total Interactions</p>
                  </div>
                </div>
              </div>

              {/* API Key Status */}
              <div>
                <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">API Configuration</h3>
                <div className="p-4 border border-bolt-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-bolt-gray-600" />
                      <span className="font-medium text-bolt-gray-900">Gemini API Key</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.has_gemini_key ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">Configured</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600 font-medium">Not Configured</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {user.user_tier === 'free' && !user.has_gemini_key && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        This free tier user needs to configure their Gemini API key to upload documents.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Limits */}
              {user.user_tier === 'free' && (
                <div>
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Upload Limits</h3>
                  <div className="p-4 border border-bolt-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-bolt-gray-700">Daily Limit</span>
                      <span className="text-sm text-bolt-gray-900">{user.daily_uploads_count} / 3</span>
                    </div>
                    <div className="w-full bg-bolt-gray-200 rounded-full h-2">
                      <div 
                        className="bg-bolt-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(user.daily_uploads_count / 3) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-bolt-gray-500">
                      Resets daily at midnight UTC
                    </div>
                    {user.last_upload_date && (
                      <div className="mt-2 text-xs text-bolt-gray-600">
                        Last upload: {user.last_upload_date}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div>
                <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Account Active</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  
                  {user.user_tier === 'free' && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Free tier user with {user.has_gemini_key ? 'configured' : 'missing'} API key
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}