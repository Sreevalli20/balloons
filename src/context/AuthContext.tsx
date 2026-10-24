import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../supabase';
import { UserProfile, UserRole } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  connectionStatus: 'connected' | 'checking' | 'error';
  connectionError: string | null;
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch user profile from Supabase database
      setConnectionStatus('checking');
      setConnectionError(null);
      try {
        await fetchProfile(session.user.id, session.user.email || '');
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionStatus('error');
        setConnectionError(err instanceof Error ? err.message : 'Failed to connect to database');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const newProfile = await createInitialProfile(userId, email);
          setProfile(newProfile);
        } else {
          console.error('Error fetching profile:', error);
        }
        return;
      }

      // Convert snake_case to camelCase for frontend consistency
      const userProfile: UserProfile = {
        uid: profileData.uid,
        email: profileData.email,
        displayName: profileData.display_name,
        role: profileData.role as UserRole,
        organizationName: profileData.organization_name,
        phone: profileData.phone || '',
        address: profileData.address || '',
        latitude: profileData.latitude || 12.9352,
        longitude: profileData.longitude || 77.6245,
        isVerified: profileData.is_verified || false,
        ngoRegNumber: profileData.ngo_reg_number || '',
        ngoCapacityMeals: profileData.ngo_capacity_meals || 100,
        ngoDietaryTypes: profileData.ngo_dietary_types || ['veg', 'non_veg'],
        donorType: profileData.donor_type || 'restaurant',
        verificationNotes: profileData.verification_notes || '',
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      };

      setProfile(userProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const createInitialProfile = async (userId: string, email: string): Promise<UserProfile> => {
    const isSystemAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isSystemAdmin ? 'admin' : 'donor';
    const organizationName = isSystemAdmin ? 'Administrator' : 'Surplus Food Donor';

    const { data, error } = await supabase
      .from('users')
      .insert({
        uid: userId,
        email,
        display_name: 'Member',
        role: defaultRole,
        organization_name: organizationName,
        phone: '',
        address: 'City Center',
        latitude: 12.9352,
        longitude: 77.6245,
        is_verified: isSystemAdmin,
        ngo_reg_number: '',
        ngo_capacity_meals: 100,
        ngo_dietary_types: ['veg', 'non_veg'],
        donor_type: 'restaurant',
        verification_notes: '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return {
      uid: data.uid,
      email: data.email,
      displayName: data.display_name,
      role: data.role as UserRole,
      organizationName: data.organization_name,
      phone: data.phone || '',
      address: data.address || '',
      latitude: data.latitude || 12.9352,
      longitude: data.longitude || 77.6245,
      isVerified: data.is_verified || false,
      ngoRegNumber: data.ngo_reg_number || '',
      ngoCapacityMeals: data.ngo_capacity_meals || 100,
      ngoDietaryTypes: data.ngo_dietary_types || ['veg', 'non_veg'],
      donorType: data.donor_type || 'restaurant',
      verificationNotes: data.verification_notes || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
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

      // Create profile in Supabase database
      const { data: profileResult, error: profileError } = await supabase
        .from('users')
        .insert({
          uid,
          email,
          display_name: profileData.displayName || 'Member',
          role: isSystemAdmin ? 'admin' : (profileData.role || 'donor'),
          organization_name: profileData.organizationName || 'Organization',
          phone: profileData.phone || '',
          address: profileData.address || 'City Center',
          latitude: profileData.latitude || 12.9352,
          longitude: profileData.longitude || 77.6245,
          is_verified: isSystemAdmin,
          ngo_reg_number: profileData.ngoRegNumber || '',
          ngo_capacity_meals: profileData.ngoCapacityMeals || 100,
          ngo_dietary_types: profileData.ngoDietaryTypes || ['veg', 'non_veg'],
          donor_type: profileData.donorType || 'restaurant',
          verification_notes: profileData.verificationNotes || '',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      // Auto-sign in after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (signInError) {
        console.error('Auto sign-in error:', signInError);
        // Don't throw - user was created successfully
      }
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const updateData: any = {};

      // Convert camelCase to snake_case for database
      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.organizationName !== undefined) updateData.organization_name = data.organizationName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.ngoRegNumber !== undefined) updateData.ngo_reg_number = data.ngoRegNumber;
      if (data.ngoCapacityMeals !== undefined) updateData.ngo_capacity_meals = data.ngoCapacityMeals;
      if (data.ngoDietaryTypes !== undefined) updateData.ngo_dietary_types = data.ngoDietaryTypes;
      if (data.donorType !== undefined) updateData.donor_type = data.donorType;
      if (data.verificationNotes !== undefined) updateData.verification_notes = data.verificationNotes;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('uid', user.id);

      if (error) throw error;

      // Refresh profile
      await fetchProfile(user.id, user.email || '');
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
        connectionStatus,
        connectionError,
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
