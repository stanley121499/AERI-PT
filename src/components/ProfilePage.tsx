import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUserInfoContext } from "../contexts/UserInfoContext";
import { Sidebar } from "./Sidebar";
import { UserInfo } from "../contexts/UserInfoContext";
import { supabase } from "../lib/supabase";

/**
 * Enhanced profile page component for comprehensive user account and fitness information management
 * Implements brand identity with Electric Calm palette
 */
export function ProfilePage(): React.JSX.Element {
  const { user, signOut } = useAuthContext();
  const { userInfo, updateUserInfo, loading: userInfoLoading, cleanupDuplicateRecords, ensureUserInfoExists } = useUserInfoContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"account" | "fitness" | "preferences">("account");
  
  // Profile picture state
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Form state for user fitness information
  const [formData, setFormData] = useState<Partial<UserInfo>>({
    goal: "",
    height: null,
    initial_weight: null,
    expected_frequency_per_week: null,
    expected_workout_duration_per_day_in_mins: null,
    accessible_equipment: "",
    exercise_that_i_dont_like: "",
  });

  // Initialize form data when userInfo loads
  useEffect(() => {
    if (userInfo) {
      setFormData({
        goal: userInfo.goal || "",
        height: userInfo.height,
        initial_weight: userInfo.initial_weight,
        expected_frequency_per_week: userInfo.expected_frequency_per_week,
        expected_workout_duration_per_day_in_mins: userInfo.expected_workout_duration_per_day_in_mins,
        accessible_equipment: userInfo.accessible_equipment || "",
        exercise_that_i_dont_like: userInfo.exercise_that_i_dont_like || "",
      });
    }
  }, [userInfo]);

  const loadProfilePicture = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(`profiles/${user.id}/avatar.jpg`);
      
      // Check if the image actually exists by trying to fetch it
      const response = await fetch(data.publicUrl);
      if (response.ok) {
        setProfilePicUrl(data.publicUrl);
      }
    } catch (error) {
      console.log('No profile picture found');
    }
  }, [user]);

  // Load profile picture URL when user loads
  useEffect(() => {
    if (user) {
      loadProfilePicture();
    }
  }, [user, loadProfilePicture]);

  // Clean up duplicate records when userInfo loads
  useEffect(() => {
    if (userInfo && user) {
      // Run cleanup in the background
      cleanupDuplicateRecords().then((success) => {
        if (success) {
          console.log("ProfilePage - Duplicate cleanup completed");
        }
      }).catch((error) => {
        console.error("ProfilePage - Error during cleanup:", error);
      });
    }
  }, [userInfo, user, cleanupDuplicateRecords]);

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingPic(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profiles/${user.id}/avatar.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      setProfilePicUrl(data.publicUrl);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      setError(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      setSuccess('Password updated successfully!');
      setShowPasswordChange(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setTimeout(() => setSuccess(null), 3000);

    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signOut();
    
    if (error) {
      setError(error.message || "An error occurred during sign out");
    }
    
    setLoading(false);
  };

  const handleSaveFitnessInfo = async () => {
    if (!user) {
      setError("You must be logged in to save your information");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Ensure userInfo exists, create if needed
      let currentUserInfo = userInfo;
      if (!currentUserInfo) {
        console.log("No userInfo found, attempting to create one...");
        currentUserInfo = await ensureUserInfoExists();
        if (!currentUserInfo) {
          throw new Error("Failed to create user information record");
        }
      }

      // Prepare the data for saving
      const userInfoData = {
        goal: formData.goal || null,
        height: formData.height || null,
        initial_weight: formData.initial_weight || null,
        expected_frequency_per_week: formData.expected_frequency_per_week || null,
        expected_workout_duration_per_day_in_mins: formData.expected_workout_duration_per_day_in_mins || null,
        accessible_equipment: formData.accessible_equipment || null,
        exercise_that_i_dont_like: formData.exercise_that_i_dont_like || null,
      };

      // Use the context method to update user info
      console.log("Updating user_info with ID:", currentUserInfo.id);
      
      const success = await updateUserInfo(currentUserInfo.id, userInfoData);

      if (!success) {
        throw new Error("Failed to update user information");
      }

      console.log("Successfully updated user_info");
      setSuccess("Your fitness information has been saved successfully!");
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error("Failed to save user info:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (userInfoLoading) {
    return (
      <>
        <Sidebar currentPage="profile" />
        <div className="min-h-screen bg-white lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-semibold text-sm">S</span>
            </div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar currentPage="profile" />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-100">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 text-sm mt-1">Manage your account and fitness information</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xl">👤</span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { id: "account", label: "Account", icon: "🏠" },
                { id: "fitness", label: "Fitness Profile", icon: "💪" },
                { id: "preferences", label: "Preferences", icon: "⚙️" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-6 py-8">
          <div className="max-w-4xl">
            {/* Success/Error Messages */}
            {success && (
              <div className="rounded-md bg-green-50 p-4 mb-6">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}
            
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-6">
                {/* Profile Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
                  
                  <div className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <div 
                        className="relative w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={handleProfilePictureClick}
                      >
                        {profilePicUrl ? (
                          <img 
                            src={profilePicUrl} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 text-2xl">👤</span>
                        )}
                        {uploadingPic && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {profilePicUrl ? "Click to change your photo" : "Upload a profile picture"}
                        </p>
                        <button 
                          onClick={handleProfilePictureClick}
                          disabled={uploadingPic}
                          className="text-sm font-medium text-gray-900 hover:text-gray-700 underline disabled:opacity-50"
                        >
                          {uploadingPic ? "Uploading..." : "Change photo"}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email address
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm bg-gray-50 text-gray-500"
                          />
                          <button className="text-sm font-medium text-gray-900 hover:text-gray-700 underline whitespace-nowrap">
                            Change
                          </button>
                        </div>
                      </div>

                      {/* Account Created */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Member since
                        </label>
                        <input
                          type="text"
                          value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""}
                          disabled
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* User ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={user?.id || ""}
                        disabled
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm bg-gray-50 text-gray-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security</h2>
                  
                  {!showPasswordChange ? (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Password</h3>
                        <p className="text-sm text-gray-500">Keep your account secure with a strong password</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordChange(true)}
                        className="text-sm font-medium text-gray-900 hover:text-gray-700 underline"
                      >
                        Change password
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                          placeholder="Enter new password"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="flex items-center justify-center rounded-lg bg-gray-900 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {passwordLoading ? "Updating..." : "Update Password"}
                        </button>
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ newPassword: "", confirmPassword: "" });
                            setError(null);
                          }}
                          className="flex items-center justify-center rounded-lg bg-white py-2 px-4 text-sm font-semibold text-gray-900 shadow-sm border border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sign Out */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign Out</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Sign out of your account on this device. You'll need to sign back in to access your workouts.
                  </p>
                  <button
                    onClick={handleSignOut}
                    disabled={loading}
                    className="flex items-center justify-center rounded-lg bg-red-600 py-3 px-6 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}

            {/* Fitness Profile Tab */}
            {activeTab === "fitness" && (
              <div className="space-y-6">
                {/* Goals & Objectives */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Goals & Objectives</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fitness Goals
                      </label>
                      <textarea
                        placeholder="Describe your fitness goals in detail... e.g., 'I want to lose 10kg and build muscle definition in my arms and core. I'm also training for a 5K run in 3 months.'"
                        value={formData.goal || ""}
                        onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Be specific about what you want to achieve. This helps our AI create better personalized workouts for you.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Physical Stats */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Physical Statistics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 175"
                        value={formData.height || ""}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Weight (kg)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 70"
                        value={formData.initial_weight || ""}
                        onChange={(e) => setFormData({ ...formData, initial_weight: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Workout Preferences */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Workout Preferences</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Workout Frequency (per week)
                      </label>
                      <select
                        value={formData.expected_frequency_per_week || ""}
                        onChange={(e) => setFormData({ ...formData, expected_frequency_per_week: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      >
                        <option value="">Select frequency</option>
                        <option value="1">1 day per week</option>
                        <option value="2">2 days per week</option>
                        <option value="3">3 days per week</option>
                        <option value="4">4 days per week</option>
                        <option value="5">5 days per week</option>
                        <option value="6">6 days per week</option>
                        <option value="7">7 days per week</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Duration (minutes)
                      </label>
                      <select
                        value={formData.expected_workout_duration_per_day_in_mins || ""}
                        onChange={(e) => setFormData({ ...formData, expected_workout_duration_per_day_in_mins: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      >
                        <option value="">Select duration</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="75">75 minutes</option>
                        <option value="90">90 minutes</option>
                        <option value="120">120 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Equipment & Limitations */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Equipment & Limitations</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Equipment
                      </label>
                      <textarea
                        placeholder="e.g., Dumbbells, resistance bands, pull-up bar, treadmill..."
                        value={formData.accessible_equipment || ""}
                        onChange={(e) => setFormData({ ...formData, accessible_equipment: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        List all equipment you have access to. Leave blank if you prefer bodyweight exercises.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exercises to Avoid
                      </label>
                      <textarea
                        placeholder="e.g., Squats (knee injury), overhead press, running..."
                        value={formData.exercise_that_i_dont_like || ""}
                        onChange={(e) => setFormData({ ...formData, exercise_that_i_dont_like: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        List exercises you want to avoid due to injuries, preferences, or limitations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveFitnessInfo}
                    disabled={loading}
                    className="flex items-center justify-center rounded-lg bg-gray-900 py-3 px-8 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save Fitness Profile"}
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                {/* Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notifications</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Workout Reminders</h3>
                        <p className="text-sm text-gray-500">Get notified about scheduled workouts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Progress Updates</h3>
                        <p className="text-sm text-gray-500">Weekly progress reports and achievements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Units & Display */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Units & Display</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight Units
                      </label>
                      <select className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500">
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lbs">Pounds (lbs)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distance Units
                      </label>
                      <select className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500">
                        <option value="metric">Kilometers (km)</option>
                        <option value="imperial">Miles (mi)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data & Privacy */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Data & Privacy</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Data Analytics</h3>
                        <p className="text-sm text-gray-500">Help improve the app by sharing anonymous usage data</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
