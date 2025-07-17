'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AddUserModal from '@/components/AddUserModal';
import EditUserModal from '@/components/EditUserModal';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  status?: 'active' | 'pending_approval' | 'inactive';
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);

  // Filter users based on search and filters
  useEffect(() => {
    const filtered = users
      .filter(user => {
        if (searchQuery.trim()) {
          return (
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      })
      .filter(user => {
        if (roleFilter !== 'All Roles') {
          return user.role === roleFilter.toLowerCase();
        }
        return true;
      })
      .filter(user => {
        if (statusFilter !== 'All Status') {
          return user.status === statusFilter.toLowerCase().replace(' ', '_');
        }
        return true;
      });
    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('All Roles');
    setStatusFilter('All Status');
  };

  // Calculate analytics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const inactiveUsers = users.filter(user => user.status === 'inactive').length;
  const pendingApprovals = pendingUsers.length;
  // Function to get list of all users (active and pending)
  const fetchAllUsers = useCallback(async (token: string) => {
    try {
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!usersResponse.ok) throw new Error('Failed to get user list.');
      const usersData = await usersResponse.json();
      setUsers(usersData);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred');
    }
  }, []);

  // Function to get list of users awaiting approval
  const fetchPendingUsers = useCallback(async (token: string) => {
    try {
      const pendingUsersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/pending-users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!pendingUsersResponse.ok) throw new Error('Failed to get list of users awaiting approval.');
      const pendingUsersData = await pendingUsersResponse.json();
      setPendingUsers(pendingUsersData);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred');
    }
  }, []);

  // Function to approve user
  const handleApproveClick = async (userId: number) => {
    if (!window.confirm(`Are you sure you want to approve user with ID ${userId}?`)) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/approve-user/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to approve user.');
      
      alert(data.msg);
      await Promise.all([fetchAllUsers(token!), fetchPendingUsers(token!)]);
    } catch (err) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('Unknown error occurred');
    }
  };

  // Function to toggle user active/inactive status
  const handleToggleUserStatus = async (userId: number, currentStatus: string, username: string) => {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} user "${username}"?`)) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/toggle-user-status/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to toggle user status.');
      
      alert(data.msg);
      await Promise.all([fetchAllUsers(token!), fetchPendingUsers(token!)]);
    } catch (err) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('Unknown error occurred');
    }
  };

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const authResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!authResponse.ok) throw new Error('Invalid session.');
        const authData = await authResponse.json();
        if (authData.user.role !== 'admin') {
          throw new Error('Access denied.');
        }
        
        await Promise.all([
          fetchAllUsers(token),
          fetchPendingUsers(token)
        ]);

      } catch (err) {
        console.error("Authentication error:", err);
        if (err instanceof Error) setError(err.message);
        else setError('Unknown error occurred');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchData();
  }, [router, fetchAllUsers, fetchPendingUsers]);

  const handleEditClick = (userToEdit: User) => {
    setCurrentUserToEdit(userToEdit);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}" (ID: ${userId})? This action cannot be undone.`)) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to delete user.');
      
      alert(data.msg);
      await Promise.all([fetchAllUsers(token!), fetchPendingUsers(token!)]);
    } catch (err) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('Unknown error occurred');
    }
  };

  if (loading) { 
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading admin data...</p>
      </main>
    ); 
  }
  
  if (error) { 
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">Error: {error}</p>
      </main>
    ); 
  }

  return (
    <>
      <AddUserModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onUserAdded={() => Promise.all([fetchAllUsers(localStorage.getItem('token')!), fetchPendingUsers(localStorage.getItem('token')!)])} 
      />
      <EditUserModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onUserUpdated={() => Promise.all([fetchAllUsers(localStorage.getItem('token')!), fetchPendingUsers(localStorage.getItem('token')!)])} 
        userToEdit={currentUserToEdit} 
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Users Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inactive Users Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                  <p className="text-3xl font-bold text-gray-900">{inactiveUsers}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending Approvals Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingApprovals}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Users</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="All Roles">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="All Status">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending_approval">Pending Approval</option>
                </select>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredUsers.length} of {totalUsers} users
            </div>
          </div>

          {/* Admin Applications Awaiting Approval */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Applications Awaiting Approval</h2>
            {pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Username</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Application Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{user.id}</td>
                        <td className="py-3 px-4 text-gray-900 font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-gray-600">{user.email}</td>
                        <td className="py-3 px-4 text-gray-600">{new Date(user.created_at).toLocaleDateString('en-US')}</td>
                        <td className="py-3 px-4 space-x-2">
                          <button 
                            onClick={() => handleApproveClick(user.id)} 
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(user.id, user.username)} 
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No new admin applications at this time.</p>
            )}
          </div>

          {/* All Users Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">All Users Management</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                + Add New User
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">USERNAME</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">EMAIL</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ROLE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">STATUS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{user.id}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{user.username}</td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : user.status === 'inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        <button 
                          onClick={() => handleEditClick(user)} 
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(user.id, user.username)} 
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.status!, user.username)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            user.status === 'active' 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}