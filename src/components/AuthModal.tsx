import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { DonorRegistrationForm } from './auth/DonorRegistrationForm';
import { NgoRegistrationForm } from './auth/NgoRegistrationForm';
import {
  X,
  Mail,
  Lock,
  HeartHandshake,
  Utensils,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onNavigate?: (tab: 'donor' | 'ngo') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'donor',
  onNavigate,
}) => {
  const { signInWithEmail } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register_donor' | 'register_ngo'>(
    'login'
  );

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter your email and password.');
      }
      await signInWithEmail(email.trim(), password);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Invalid login credentials') ||
        msg.includes('User not found')
      ) {
        setError('Invalid email or password. If you are new, please register below.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDonorRegistered = () => {
    onClose();
    if (onNavigate) {
      onNavigate('donor');
    }
  };

  const handleNgoRegistered = () => {
    onClose();
    if (onNavigate) {
      onNavigate('ngo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* View Switcher Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthView('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authView === 'login'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthView('register_donor');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authView === 'register_donor'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register Donor
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthView('register_ngo');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authView === 'register_ngo'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register NGO
          </button>
        </div>

        {/* 1. SIGN IN VIEW */}
        {authView === 'login' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Utensils className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Sign In to AnnaSetu AI</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Access your real-time Food Donor or Relief NGO workspace
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span>Signing in...</span> : <span>Sign In</span>}
              </button>
            </form>

            {/* Quick Registration Route Cards */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <div className="text-[11px] font-semibold text-gray-500 text-center">
                New to AnnaSetu AI? Choose your registration path:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthView('register_donor')}
                  className="p-3 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl text-left transition-all"
                >
                  <Utensils className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="font-bold text-gray-900 text-xs">Food Donor</div>
                  <div className="text-[10px] text-gray-500">
                    Restaurants, caterers & grocers
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthView('register_ngo')}
                  className="p-3 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl text-left transition-all"
                >
                  <HeartHandshake className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="font-bold text-gray-900 text-xs">Relief NGO</div>
                  <div className="text-[10px] text-gray-500">
                    Food banks, shelters & missions
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. DEDICATED DONOR REGISTRATION VIEW */}
        {authView === 'register_donor' && (
          <DonorRegistrationForm
            onSuccess={handleDonorRegistered}
            onSwitchToLogin={() => setAuthView('login')}
            onSwitchToNgoRegister={() => setAuthView('register_ngo')}
          />
        )}

        {/* 3. DEDICATED NGO REGISTRATION VIEW */}
        {authView === 'register_ngo' && (
          <NgoRegistrationForm
            onSuccess={handleNgoRegistered}
            onSwitchToLogin={() => setAuthView('login')}
            onSwitchToDonorRegister={() => setAuthView('register_donor')}
          />
        )}
      </div>
    </div>
  );
};
