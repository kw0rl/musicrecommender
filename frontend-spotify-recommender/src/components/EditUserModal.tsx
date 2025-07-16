'use client';

import { useState, useEffect, FormEvent } from 'react';

// Define the User interface
interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

// Define props for this component
interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void; // Function to notify parent that user has been updated
  userToEdit: User | null;   // The user data to be edited
}

export default function EditUserModal({ isOpen, onClose, onUserUpdated, userToEdit }: EditUserModalProps) {
  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Only used for setting a new password
  const [role, setRole] = useState<'user' | 'admin'>('user');
  
  // State for message and loading status
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Populate form when modal opens with selected user data
  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setPassword(''); // Keep empty, admin fills only if changing password
      setError(null); // Reset error when a new user is selected
    }
  }, [userToEdit]); // Trigger effect when 'userToEdit' changes

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!userToEdit) {
      setError("No user selected for update.");
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Invalid admin session. Please log in again.");
      setIsLoading(false);
      return;
    }

    // Build the 'payload' with ONLY fields that changed
    const payload: { [key: string]: any } = {};
    if (username !== userToEdit.username) payload.username = username;
    if (email !== userToEdit.email) payload.email = email;
    if (role !== userToEdit.role) payload.role = role;
    if (password) { // Only include password if field is not empty
      payload.password = password;
    }

    // If no changes detected, avoid sending API request
    if (Object.keys(payload).length === 0) {
      setError("No changes detected.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || data.errors?.map((e: any) => e.msg).join(', ') || 'Failed to update user.');
      }

      alert('User information updated successfully!');
      onUserUpdated(); // Call parent function to refresh user list
      onClose(); // Close the modal

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null; // Do not render modal if 'isOpen' is false
  }

  return (
  // Light background (modal overlay)
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    {/* Modal Content */}
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Edit User: {userToEdit?.username}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            id="edit-username"
            name="edit-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="edit-email"
            name="edit-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password (leave empty if not changing)
          </label>
          <input
            id="edit-password"
            name="edit-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-md">{error}</p>}
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}