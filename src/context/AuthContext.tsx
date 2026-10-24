import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, testSupabaseConnection, handleSupabaseError, OperationType } from '../supabase';
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

  // Check connection on boot
  useEffect(() => {
    testSupabaseConnection().then((res) => {
      if (res.success) {
        setConnectionStatus('connected');
        setConnectionError(null);
      } else {
        setConnectionStatus('error');
        setConnectionError(res.error || 'Could not reach Supabase database.');
      }
    });
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch user profile
      await fetchProfile(session.user.id, session.user.email || '');
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist - create it
          await createInitialProfile(userId, email);
        } else {
          throw error;
        }
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      handleSupabaseError(err, OperationType.GET, `users/${userId}`);
    }
  };

  const createInitialProfile = async (userId: string, email: string) => {
    const isSystemAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isSystemAdmin ? 'admin' : 'donor';

    const newProfile: Partial<UserProfile> = {
      uid: userId,
      email,
      displayName: 'Member',
      role: defaultRole,
      organizationName: isSystemAdmin ? 'Administrator' : 'Surplus Food Donor',
      phone: '',
      address: 'City Center',
      latitude: 12.9352,
      longitude: 77.6245,
      isVerified: isSystemAdmin,
      ngoRegNumber: '',
      ngoCapacityMeals: 100,
      ngoDietaryTypes: ['veg', 'non_veg'],
      donorType: 'restaurant',
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;
      if (data) setProfile(data as UserProfile);
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, 'users');
    }
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

      const newProfile: Partial<UserProfile> = {
        uid,
        email,
        displayName: profileData.displayName || 'Member',
        role: isSystemAdmin ? 'admin' : profileData.role || 'donor',
        organizationName: profileData.organizationName || 'Organization',
        phone: profileData.phone || '',
        address: profileData.address || '',
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        isVerified: isSystemAdmin,
        ngoRegNumber: profileData.ngoRegNumber || '',
        ngoCapacityMeals: profileData.ngoCapacityMeals || 100,
        ngoDietaryTypes: profileData.ngoDietaryTypes || ['veg', 'non_veg'],
        donorType: profileData.donorType || 'restaurant',
      };

      const { error: profileError } = await supabase
        .from('users')
        .insert(newProfile);

      if (profileError) throw profileError;
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, 'users');
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');

    const updatePayload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('uid', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, `users/${user.id}`);
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
