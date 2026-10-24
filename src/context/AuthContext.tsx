import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabase';
import { UserProfile, UserRole } from '../types';
import { User } from '@supabase/supabase-js';
import {
  getUserByUid,
  saveUser,
  getUserByEmail,
  createDefaultProfile,
  setCurrentUserId,
  getCurrentUserId,
} from '../services/localStorage';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    profileData: Partial<UserProfile>
  ) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  switchActiveRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'kksreevalli2801@gmail.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Auth State
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setCurrentUserId(null);
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);
      // Fetch user profile from localStorage
      await fetchProfile(session.user.id, session.user.email || '');
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      let userProfile = getUserByUid(userId);

      if (!userProfile) {
        // Profile doesn't exist - create it
        userProfile = createInitialProfile(userId, email);
      }

      setProfile(userProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const createInitialProfile = (userId: string, email: string): UserProfile => {
    const isSystemAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isSystemAdmin ? 'admin' : 'donor';
    const organizationName = isSystemAdmin ? 'Administrator' : 'Surplus Food Donor';

    const newProfile = createDefaultProfile(userId, email, defaultRole, organizationName);
    saveUser(newProfile);
    return newProfile;
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Email sign in error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    profileData: Partial<UserProfile>
  ) => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const uid = authData.user.id;
      const isSystemAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const newProfile = createDefaultProfile(
        uid,
        email,
        isSystemAdmin ? 'admin' : (profileData.role || 'donor'),
        profileData.organizationName || 'Organization'
      );

      // Override with provided profile data
      Object.assign(newProfile, {
        displayName: profileData.displayName || 'Member',
        phone: profileData.phone || '',
        address: profileData.address || '',
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        ngoRegNumber: profileData.ngoRegNumber || '',
        ngoCapacityMeals: profileData.ngoCapacityMeals || 100,
        ngoDietaryTypes: profileData.ngoDietaryTypes || ['veg', 'non_veg'],
        donorType: profileData.donorType || 'restaurant',
      });

      saveUser(newProfile);
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const updatedProfile = {
        ...profile,
        ...data,
        updatedAt: new Date().toISOString(),
      } as UserProfile;

      saveUser(updatedProfile);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  };

  const switchActiveRole = async (role: UserRole) => {
    if (!user) return;
    await updateProfileData({ role });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id, user.email || '');
  };

  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signInWithEmail,
        signUpWithEmail,
        updateProfileData,
        switchActiveRole,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
