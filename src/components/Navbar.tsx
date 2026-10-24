import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Utensils,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  Sparkles,
  MapPin,
  CheckCircle,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'donor' | 'ngo' | 'impact' | 'admin';
  setActiveTab: (tab: 'donor' | 'ngo' | 'impact' | 'admin') => void;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
}) => {
  const { user, profile, isAdmin, switchActiveRole, logout, connectionStatus } = useAuth();

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    await switchActiveRole(newRole);
    if (newRole === 'donor') setActiveTab('donor');
    else if (newRole === 'ngo') setActiveTab('ngo');
    else if (newRole === 'admin') setActiveTab('admin');
  };

  return (
    <header className="bg-white border-b border-emerald-100 sticky top-0 z-40 shadow-xs">
      {/* Top micro-bar */}
      <div className="bg-emerald-900 text-emerald-100 text-[11px] px-4 py-1 flex justify-between items-center tracking-wide font-medium">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
            Team BRAIN CATALYST
          </span>
          <span className="hidden sm:inline text-emerald-300">|</span>
          <span className="hidden sm:inline text-emerald-200">
            AnnaSetu AI — One Network. Less Waste. More Meals.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-emerald-200 text-[11px] hidden md:inline">
              {connectionStatus === 'connected'
                ? 'Firestore Real-Time Live'
                : connectionStatus === 'checking'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>
          {profile && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-emerald-800 text-emerald-200">
              <MapPin className="w-3 h-3 text-emerald-300" />
              <span className="truncate max-w-[140px] text-[11px]">
                {profile.address || 'Location set'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('donor')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-gray-900">
                  Anna<span className="text-emerald-600">Setu</span>
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded tracking-wider uppercase">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Surplus Food Rescue & Relief Network
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('donor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'donor'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Utensils className="w-4 h-4 text-emerald-600" />
              <span>Donor Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('ngo')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ngo'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              <span>NGO Network</span>
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'impact'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Impact</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin</span>
            </button>
          </nav>

          {/* User Account & Actions */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2">
                {/* Role switcher for immediate testing/switching */}
                <div className="hidden lg:flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs">
                  <span className="text-gray-500 font-medium">Role:</span>
                  <select
                    value={profile?.role || 'donor'}
                    onChange={handleRoleChange}
                    className="bg-transparent font-semibold text-emerald-800 border-none outline-hidden cursor-pointer"
                  >
                    <option value="donor">Food Donor</option>
                    <option value="ngo">Relief NGO</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                </div>

                {/* Profile pill */}
                <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {(profile?.displayName || user.email || 'U')[0]}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[120px]">
                      {profile?.organizationName || profile?.displayName || 'User'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium capitalize flex items-center gap-1">
                      {profile?.role || 'donor'}
                      {profile?.isVerified && (
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-600 inline" />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
