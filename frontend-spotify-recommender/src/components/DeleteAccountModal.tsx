'use client';

import { useState, FormEvent } from 'react';

// Define the props accepted by this component
interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void; // Function to notify parent that the account has been deleted
}

export default function DeleteAccountModal({ isOpen, onClose, onAccountDeleted }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Invalid session. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }), // Send password for verification
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || (data.errors && Array.isArray(data.errors) ? data.errors.map((e: { msg: string }) => e.msg).join(', ') : '') || 'Failed to delete account.');
      }

      // Success!
      alert(data.msg); // Show success message from backend
      onAccountDeleted(); // Call parent function to log out and redirect

    } catch (err) {
      console.error(err);
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null; // If 'isOpen' is false, render nothing
  }

  return (
    // Modal overlay (dark background)
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      {/* Modal content */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-white border border-red-500">
        <h2 className="text-2xl font-bold mb-2 text-red-400">Permanently Delete Account</h2>
        <p className="text-sm text-gray-300 mb-4">
          This action is irreversible. All your data will be deleted. Please enter your password for confirmation.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="delete-confirm-password" className="block text-sm font-medium text-gray-300">Password</label>
            <input
              id="delete-confirm-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Yes, Delete My Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
