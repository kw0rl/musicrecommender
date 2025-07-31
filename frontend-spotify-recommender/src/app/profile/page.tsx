// src/app/profile/page.tsx
'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Add useSearchParams
import Link from 'next/link';
import Image from 'next/image';
import DeleteAccountModal from '@/components/DeleteAccountModal';

// Define User interface
interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  profile_image: string | null; // Add profile image field
  // Add spotify column to check connection status
  spotify_access_token: string | null;
}

function ProfilePageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for edit profile form
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // State for change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State for delete account modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // State for profile image upload
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Force re-render of image
  
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook to read query parameter from URL

  // useEffect to get user data
  useEffect(() => {
    // Show message if Spotify connection successful
    if (searchParams.get('spotify_connected') === 'true') {
        alert("Spotify account successfully connected!");
        // Clear URL from query parameter to avoid alert appearing again on refresh
        router.replace('/profile', { scroll: false });
    }

    const fetchUserData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Invalid session");
        const data = await response.json();
        setUser(data.user);
        setUsernameInput(data.user.username);
        setEmailInput(data.user.email);
        // Reset image error state when user data loads
        setImageLoadError(false);
        setImageKey(prev => prev + 1); // Force image refresh
      } catch (error) {
        console.error("Error getting profile data:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [router, searchParams]); // Add searchParams as dependency

  // useEffect to handle image refresh when user profile_image changes
  useEffect(() => {
    if (user?.profile_image) {
      setImageLoadError(false);
      setImageKey(prev => prev + 1);
      
      // Preload the image to ensure it's ready
      if (typeof window !== 'undefined') {
        const img = new window.Image();
        img.onload = () => {
          console.log('Profile image preloaded successfully');
        };
        img.onerror = () => {
          console.warn('Profile image preload failed');
          setImageLoadError(true);
        };
        img.src = `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image}?t=${Date.now()}`;
      }
    }
  }, [user?.profile_image]);

  // Function to update profile (username/email)
  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    const payload: { [key: string]: string } = {};
    if (usernameInput !== user?.username) payload.username = usernameInput;
    if (emailInput !== user?.email) payload.email = emailInput;

    if (Object.keys(payload).length === 0) {
      setProfileMessage({ type: 'error', text: 'No changes detected.' });
      setIsUpdatingProfile(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token!}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to update profile.');
      
      setProfileMessage({ type: 'success', text: 'Profile successfully updated!' });
      setUser(data.user); // Update user state with new data
    } catch (error) {
      if (error instanceof Error) setProfileMessage({ type: 'error', text: error.message });
      else setProfileMessage({ type: 'error', text: 'Unknown error occurred' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Function to change password
  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setIsChangingPassword(true);

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      setIsChangingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      setIsChangingPassword(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token!}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to update password.');

      setPasswordMessage({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      if (error instanceof Error) setPasswordMessage({ type: 'error', text: error.message });
      else setPasswordMessage({ type: 'error', text: 'Unknown error occurred' });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Function to handle after account successfully deleted
  const handleAccountDeleted = () => {
    alert("Your account has been deleted. You will be logged out.");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/'); // Redirect to main page after account deletion
  };

// ---- NEW FUNCTION TO CONNECT TO SPOTIFY ----
  const handleSpotifyConnect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const spotifyLoginUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/spotify/login?token=${token}`;
      window.location.href = spotifyLoginUrl;
    } else {
      alert("Your session has expired. Please log in again.");
      router.push('/login');
    }
  };

  // ---- NEW FUNCTION TO FORCE RE-AUTHORIZATION ----
  const handleSpotifyForceReauth = async () => {
    const confirmReauth = confirm("This will force Spotify to ask for permissions again. This may fix connection issues. Continue?");
    if (!confirmReauth) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Your session has expired. Please log in again.");
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spotify/force-reauth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        // Redirect to new authorization URL
        window.location.href = data.authorization_url;
      } else {
        alert(`Failed to force re-authorization: ${data.error}`);
      }
    } catch (error) {
      console.error('Error forcing re-authorization:', error);
      alert('Failed to force re-authorization. Please try again.');
    }
  };

  // ---- NEW FUNCTION TO DISCONNECT FROM SPOTIFY ----
  const handleSpotifyDisconnect = async () => {
    const confirmDisconnect = confirm("Are you sure you want to disconnect from Spotify? You will need to reconnect to play music.");
    if (!confirmDisconnect) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Your session has expired. Please log in again.");
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/spotify/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update user state to remove Spotify connection
        setUser(prev => prev ? {
          ...prev,
          spotify_access_token: null,
          spotify_refresh_token: null,
          spotify_token_expires_at: null
        } : null);
        
        alert("Successfully disconnected from Spotify!");
      } else {
        const error = await response.json();
        alert(`Failed to disconnect: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error disconnecting from Spotify:', error);
      alert('Failed to disconnect from Spotify. Please try again.');
    }
  };
  // ---------------------------------------------

  // Function to handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setProfileMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setProfileMessage({ type: 'error', text: 'Please select a valid image file' });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to upload profile image
  const handleImageUpload = async () => {
    if (!selectedImage) return;
    
    setIsUploadingImage(true);
    setProfileMessage(null);
    
    const formData = new FormData();
    formData.append('profileImage', selectedImage);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/upload-profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token!}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to upload image.');
      
      setProfileMessage({ type: 'success', text: 'Profile image updated successfully!' });
      setUser(data.user); // Update user state with new image
      setSelectedImage(null);
      setImagePreview(null);
      setImageLoadError(false);
      
      // Force image component to re-render with cache busting
      setImageKey(prev => prev + 1);
      
      // Reload after a short delay to ensure backend file is ready
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      if (error instanceof Error) setProfileMessage({ type: 'error', text: error.message });
      else setProfileMessage({ type: 'error', text: 'Unknown error occurred' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Function to remove profile image
  const handleRemoveImage = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/remove-profile-image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token!}`,
        },
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'Failed to remove image.');
      
      setProfileMessage({ type: 'success', text: 'Profile image removed successfully!' });
      setUser(data.user); // Update user state
      setImageLoadError(false);
      setImageKey(prev => prev + 1); // Force re-render
    } catch (error) {
      if (error instanceof Error) setProfileMessage({ type: 'error', text: error.message });
      else setProfileMessage({ type: 'error', text: 'Unknown error occurred' });
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-800 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile. Redirecting you...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onAccountDeleted={handleAccountDeleted}
      />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>
              <Link href="/" className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 inline mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Overview */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="text-center">
                  {/* Profile Image */}
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    {(imagePreview || (user.profile_image && !imageLoadError)) ? (
                      <Image 
                        key={imageKey} // Force re-render on key change
                        src={imagePreview || `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image}?t=${Date.now()}`} // Add timestamp for cache busting
                        alt="Profile" 
                        width={96}
                        height={96}
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        unoptimized={true}
                        priority={true} // Load image with priority
                        onError={(e) => {
                          console.error('Profile image failed to load:', `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image}`);
                          setImageLoadError(true);
                        }}
                        onLoad={() => {
                          console.log('Profile image loaded successfully');
                          setImageLoadError(false);
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Camera icon button */}
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Upload Controls */}
                  {selectedImage && (
                    <div className="mb-4 space-y-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleImageUpload}
                          disabled={isUploadingImage}
                          className="px-3 py-1 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {isUploadingImage ? 'Uploading...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Image Error Retry Button */}
                  {user.profile_image && imageLoadError && (
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          setImageLoadError(false);
                          setImageKey(prev => prev + 1);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Retry Load Image
                      </button>
                    </div>
                  )}

                  {/* Remove Image Button */}
                  {user.profile_image && !selectedImage && (
                    <div className="mb-4">
                      <button
                        onClick={handleRemoveImage}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  <h2 className="text-xl font-semibold text-gray-800 mb-1">{user.username}</h2>
                  <p className="text-gray-600 text-sm mb-4">{user.email}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Role:</span>
                      <span className="capitalize font-medium text-gray-800">{user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Joined:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(user.created_at).toLocaleDateString('en-US', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Settings */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Details Form */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Profile Details</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input 
                      id="username" 
                      type="text" 
                      value={usernameInput} 
                      onChange={(e) => setUsernameInput(e.target.value)} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input 
                      id="email" 
                      type="email" 
                      value={emailInput} 
                      onChange={(e) => setEmailInput(e.target.value)} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent" 
                    />
                  </div>
                  {profileMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      profileMessage.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {profileMessage.text}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      disabled={isUpdatingProfile} 
                      className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Password Form */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input 
                      id="currentPassword" 
                      type="password" 
                      required 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input 
                      id="newPassword" 
                      type="password" 
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input 
                      id="confirmNewPassword" 
                      type="password" 
                      required 
                      value={confirmNewPassword} 
                      onChange={(e) => setConfirmNewPassword(e.target.value)} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent" 
                    />
                  </div>
                  {passwordMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isChangingPassword ? 'Saving...' : 'Save New Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Profile Image Upload */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Profile Image</h3>
                <div className="flex items-center gap-4 mb-4">
                  {imagePreview ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden">
                      <Image src={imagePreview} alt="Image Preview" width={96} height={96} className="w-full h-full object-cover" />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageSelect} 
                      className="hidden" 
                      id="profileImageInput"
                    />
                    <label 
                      htmlFor="profileImageInput" 
                      className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg font-medium text-center cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {isUploadingImage ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V21h18V7.5M3 3h18" />
                          </svg>
                          Upload Image
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {imagePreview ? 'Image selected. You can upload or remove it.' : 'Select an image file (max 5MB) to upload as your profile image.'}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleImageUpload}
                    disabled={!selectedImage || isUploadingImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
              </div>

              {/* App Connections */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">App Connections</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Connect your Spotify account to enable playing songs directly from this application. 
                  (Requires Spotify Premium account).
                </p>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.760-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.746 3.808-.871 7.076-.496 9.712 1.115.293.18.386.563.207.857zm1.223-2.723c-.226.367-.706.482-1.073.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.125-.849-.106-.973-.52-.125-.414.106-.849.52-.974 3.632-1.102 8.147-.568 11.234 1.328.366.226.481.707.257 1.075zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.624-.149-.495.129-1.017.624-1.166 3.532-1.073 9.404-.865 13.115 1.338.445.264.590.837.327 1.282-.264.444-.838.590-1.283.326z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Spotify</p>
                      <p className="text-sm text-gray-600">Music streaming service</p>
                    </div>
                  </div>
                  {user.spotify_access_token ? (
                    <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-600">Connected</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSpotifyForceReauth}
                          className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                          title="Force re-authorization to fix connection issues"
                        >
                          Fix Connection
                        </button>
                        <button
                          onClick={handleSpotifyDisconnect}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSpotifyConnect}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <p className="text-gray-600 text-sm mb-6">
                  The actions below are permanent and cannot be undone. Please be careful.
                </p>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}