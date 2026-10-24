/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DonorDashboard } from './components/donor/DonorDashboard';
import { NgoDashboard } from './components/ngo/NgoDashboard';
import { ImpactDashboard } from './components/impact/ImpactDashboard';
import { AdminPanel } from './components/admin/AdminPanel';
import {
  Utensils,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'donor' | 'ngo' | 'impact' | 'admin'>('donor');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Automatically adapt tab if user switches role
  React.useEffect(() => {
    if (profile?.role === 'ngo' && activeTab === 'donor' && !user) {
      setActiveTab('ngo');
    }
  }, [profile?.role]);

  return (
    <div className="min-h-screen bg-emerald-50/20 text-gray-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'donor' && (
          <DonorDashboard openAuthModal={() => setIsAuthModalOpen(true)} />
        )}
        {activeTab === 'ngo' && (
          <NgoDashboard openAuthModal={() => setIsAuthModalOpen(true)} />
        )}
        {activeTab === 'impact' && (
          <ImpactDashboard onPostFood={() => setActiveTab('donor')} />
        )}
        {activeTab === 'admin' && (
          <AdminPanel openAuthModal={() => setIsAuthModalOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100/80 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-bold text-gray-900 text-sm">AnnaSetu AI</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                Team BRAIN CATALYST
              </span>
            </div>
            <p className="text-gray-400 text-[11px]">
              One Network. Less Waste. More Meals. Dedicated to eliminating hunger through real-time food redistribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('donor')}
              className="hover:text-emerald-700 transition-colors"
            >
              Donor Portal
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('ngo')}
              className="hover:text-emerald-700 transition-colors"
            >
              NGO Relief Network
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('impact')}
              className="hover:text-emerald-700 transition-colors"
            >
              Verified Impact Ledger
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('admin')}
              className="hover:text-emerald-700 transition-colors"
            >
              Platform Administration
            </button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={activeTab === 'ngo' ? 'ngo' : 'donor'}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
