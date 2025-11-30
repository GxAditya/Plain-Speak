/**
 * Admin Panel Component
 * Professional admin interface following PlainSpeak design system
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Shield, 
  Activity,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Upload,
  ChevronLeft,
  X,
  Loader2
} from 'lucide-react';

interface AdminPanelProps {
  user: any;
  onBack: () => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

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

interface SystemStats {
  users: {
    total: number;
    free: number;
    pro: number;
    enterprise: number;
    admins: number;
    withKeys: number;
  };
  uploads: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    usersAtLimit: number;
  };
  interactions: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    avgPerUser: number;
  };
  system: {
    cacheHitRate: number;
    avgResponseTime: number;
    errorRate: number;
    uptime: string;
  };
}

type AdminView = 'dashboard' | 'users' | 'analytics' | 'system' | 'security';

export function AdminPanel({ user, onBack, onError, onSuccess }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSystemStats(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      onError?.('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    // Mock data - in production, this would call your admin API
    const mockStats: SystemStats = {
      users: {
        total: 1247,
        free: 1156,
        pro: 78,
        enterprise: 13,
        admins: 3,
        withKeys: 892
      },
      uploads: {
        today: 234,
        thisWeek: 1567,
        thisMonth: 6789,
        usersAtLimit: 45
      },
      interactions: {
        today: 1834,
        thisWeek: 12456,
        thisMonth: 45678,
        avgPerUser: 36.7
      },
      system: {
        cacheHitRate: 87.3,
        avgResponseTime: 245,
        errorRate: 0.8,
        uptime: '99.9%'
      }
    };
    
    setSystemStats(mockStats);
  };

  const loadUsers = async () => {
    // Mock data - in production, this would call your admin API
    const mockUsers: UserData[] = [
      {
        id: '1',
        email: 'john.doe@example.com',
        role: 'user',
        user_tier: 'free',
        has_gemini_key: true,
        daily_uploads_count: 2,
        last_upload_date: '2025-01-20',
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-01-20T14:22:00Z',
        total_interactions: 45,
        last_activity: '2025-01-20T14:22:00Z'
      },
      {
        id: '2',
        email: 'sarah.wilson@company.com',
        role: 'user',
        user_tier: 'pro',
        has_gemini_key: false,
        daily_uploads_count: 8,
        last_upload_date: '2025-01-20',
        created_at: '2025-01-10T09:15:00Z',
        updated_at: '2025-01-20T16:45:00Z',
        total_interactions: 156,
        last_activity: '2025-01-20T16:45:00Z'
      }
    ];
    
    setUsers(mockUsers);
  };

  const handleUserTierChange = async (userId: string, newTier: string) => {
    try {
      // In production, call your admin API to update user tier
      console.log(`Updating user ${userId} to tier ${newTier}`);
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, user_tier: newTier } : u
      ));
      
      onSuccess?.(`User tier updated to ${newTier}`);
    } catch (error) {
      onError?.('Failed to update user tier');
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      // In production, call your admin API to update user role
      console.log(`Updating user ${userId} to role ${newRole}`);
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      onSuccess?.(`User role updated to ${newRole}`);
    } catch (error) {
      onError?.('Failed to update user role');
    }
  };

  const exportData = async (type: string) => {
    try {
      // In production, call your admin API to export data
      console.log(`Exporting ${type} data`);
      onSuccess?.(`${type} data export started`);
    } catch (error) {
      onError?.(`Failed to export ${type} data`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = !tierFilter || user.user_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-bolt-gray-900">Admin Panel</h1>
                <p className="text-sm text-bolt-gray-500">System Administration</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={loadDashboardData}
                className="flex items-center space-x-2 px-3 py-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
              <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Admin Menu</h3>
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'users', label: 'User Management', icon: Users },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'system', label: 'System Health', icon: Activity },
                  { id: 'security', label: 'Security', icon: Shield }
                ].map(item => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id as AdminView)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        currentView === item.id
                          ? 'bg-bolt-blue-100 text-bolt-blue-900'
                          : 'text-bolt-gray-600 hover:bg-bolt-gray-50 hover:text-bolt-gray-900'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentView === 'dashboard' && systemStats && (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-bolt-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-bolt-gray-900">{systemStats.users.total.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-bolt-gray-600">Today's Uploads</p>
                        <p className="text-2xl font-bold text-bolt-gray-900">{systemStats.uploads.today.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Upload className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-bolt-gray-600">AI Interactions</p>
                        <p className="text-2xl font-bold text-bolt-gray-900">{systemStats.interactions.today.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-bolt-gray-600">System Uptime</p>
                        <p className="text-2xl font-bold text-bolt-gray-900">{systemStats.system.uptime}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Activity className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Distribution */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">User Tiers</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Free Tier</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-bolt-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${(systemStats.users.free / systemStats.users.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-bolt-gray-900 w-12 text-right">
                            {systemStats.users.free}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Pro</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-bolt-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-purple-500"
                              style={{ width: `${(systemStats.users.pro / systemStats.users.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-bolt-gray-900 w-12 text-right">
                            {systemStats.users.pro}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Enterprise</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-bolt-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gold-500"
                              style={{ width: `${(systemStats.users.enterprise / systemStats.users.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-bolt-gray-900 w-12 text-right">
                            {systemStats.users.enterprise}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">System Performance</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Cache Hit Rate</span>
                        <span className="text-sm font-medium text-green-600">{systemStats.system.cacheHitRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Avg Response Time</span>
                        <span className="text-sm font-medium text-bolt-gray-900">{systemStats.system.avgResponseTime}ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Error Rate</span>
                        <span className="text-sm font-medium text-yellow-600">{systemStats.system.errorRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bolt-gray-600">Users at Limit</span>
                        <span className="text-sm font-medium text-red-600">{systemStats.uploads.usersAtLimit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'users' && (
              <div className="space-y-6">
                {/* User Management Header */}
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-bolt-gray-900">User Management</h3>
                      <p className="text-sm text-bolt-gray-600">{filteredUsers.length} users found</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => exportData('users')}
                        className="flex items-center space-x-2 px-4 py-2 bg-bolt-blue-600 text-white rounded-lg hover:bg-bolt-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-bolt-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users by email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="px-4 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">All Tiers</option>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-bolt-gray-50 border-b border-bolt-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">API Key</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">Uploads</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">Last Activity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-bolt-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bolt-gray-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-bolt-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-bolt-gray-900">{user.email}</div>
                                <div className="text-sm text-bolt-gray-500">ID: {user.id}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={user.user_tier}
                                onChange={(e) => handleUserTierChange(user.id, e.target.value)}
                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getTierColor(user.user_tier)}`}
                              >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={user.role}
                                onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getRoleColor(user.role)}`}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {user.has_gemini_key ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="ml-2 text-sm text-bolt-gray-600">
                                  {user.has_gemini_key ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-bolt-gray-900">{user.daily_uploads_count}</div>
                              <div className="text-sm text-bolt-gray-500">
                                {user.user_tier === 'free' ? '/ 3 daily' : 'unlimited'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-bolt-gray-900">
                                {user.last_activity ? formatDate(user.last_activity) : 'Never'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="text-bolt-blue-600 hover:text-bolt-blue-700 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Analytics Dashboard</h3>
                  <p className="text-bolt-gray-600">Detailed analytics and reporting features coming soon...</p>
                </div>
              </div>
            )}

            {currentView === 'system' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">System Health</h3>
                  <p className="text-bolt-gray-600">System monitoring and health checks coming soon...</p>
                </div>
              </div>
            )}

            {currentView === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Security Center</h3>
                  <p className="text-bolt-gray-600">Security monitoring and threat detection coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-bolt-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-bolt-gray-900">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-bolt-gray-400 hover:text-bolt-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Email</label>
                    <p className="text-sm text-bolt-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">User ID</label>
                    <p className="text-sm text-bolt-gray-900 font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Tier</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTierColor(selectedUser.user_tier)}`}>
                      {selectedUser.user_tier}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Role</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Created</label>
                    <p className="text-sm text-bolt-gray-900">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Last Updated</label>
                    <p className="text-sm text-bolt-gray-900">{formatDate(selectedUser.updated_at)}</p>
                  </div>
                </div>

                <div className="border-t border-bolt-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-bolt-gray-900 mb-4">Usage Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Daily Uploads</label>
                      <p className="text-sm text-bolt-gray-900">
                        {selectedUser.daily_uploads_count} / {selectedUser.user_tier === 'free' ? '3' : '∞'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Total Interactions</label>
                      <p className="text-sm text-bolt-gray-900">{selectedUser.total_interactions || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Has API Key</label>
                      <p className="text-sm text-bolt-gray-900">
                        {selectedUser.has_gemini_key ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-bolt-gray-700 mb-1">Last Upload</label>
                      <p className="text-sm text-bolt-gray-900">
                        {selectedUser.last_upload_date || 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}