import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, FoodDonation } from '../../types';
import { DonationDetailModal } from '../common/DonationDetailModal';
import {
  getNgos,
  getDonors,
  getDonations,
  toggleNgoVerification,
} from '../../services/localStorage';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Eye,
  Lock,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';

interface AdminPanelProps {
  openAuthModal?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ openAuthModal }) => {
  const { user, profile, isAdmin } = useAuth();
  const [ngos, setNgos] = useState<UserProfile[]>([]);
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [allDonations, setAllDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<'ngos' | 'donations' | 'donors'>('ngos');
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load users and donations from localStorage
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = () => {
      setNgos(getNgos());
      setDonors(getDonors());
      setAllDonations(getDonations());
      setLoading(false);
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'annasetu_users' || e.key === 'annasetu_donations') {
        loadData();
      }
    };

    const handleCustomEvent = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('annasetu-users-updated', handleCustomEvent);
    window.addEventListener('annasetu-donations-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('annasetu-users-updated', handleCustomEvent);
      window.removeEventListener('annasetu-donations-updated', handleCustomEvent);
    };
  }, [user]);

  const handleToggleVerification = async (ngo: UserProfile, makeVerified: boolean) => {
    setVerifyingId(ngo.uid);
    setActionError(null);
    setActionSuccess(null);

    try {
      toggleNgoVerification(ngo.uid, makeVerified);
      window.dispatchEvent(new CustomEvent('annasetu-users-updated'));
      setActionSuccess(
        `Successfully ${makeVerified ? 'verified' : 'revoked verification for'} ${ngo.organization_name}.`
      );
    } catch (err: unknown) {
      console.error(err);
      setActionError('Failed to update verification status');
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredNgos = ngos.filter((n) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (n.organization_name?.toLowerCase() || '').includes(q) ||
        n.email.toLowerCase().includes(q) ||
        (n.ngo_reg_number && n.ngo_reg_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredDonations = allDonations.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (d.food_name?.toLowerCase() || '').includes(q) ||
        (d.donor_name?.toLowerCase() || '').includes(q) ||
        (d.assigned_ngo_name && d.assigned_ngo_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900">
            Sign In Required for Platform Administration
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            NGO certification audit, verification review, and platform surveillance are restricted to authorized administrators.
          </p>
        </div>
        {openAuthModal && (
          <button
            onClick={openAuthModal}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
          >
            <span>Sign In to Access Admin Controls</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Team BRAIN CATALYST — Platform Operations & Trust</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Administration & NGO Verification
            </h1>
            <p className="text-gray-300 text-sm max-w-xl">
              Audit platform donations, review official NGO 12A/80G credentials, verify
              relief partner agencies, and maintain network integrity.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-4 text-xs space-y-1">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Admin Session: {user?.email || 'Authenticated'}</span>
            </div>
            <div className="text-gray-400">
              Role: <span className="text-white capitalize">{profile?.role || 'Admin'}</span>
            </div>
          </div>
        </div>

        {/* Overview metric counters */}
        <div className="mt-8 pt-6 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-black text-white">{ngos.length}</div>
            <div className="text-xs text-emerald-400">
              Registered NGOs ({ngos.filter((n) => n.is_verified).length} Verified)
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{donors.length}</div>
            <div className="text-xs text-gray-400">Registered Food Donors</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{allDonations.length}</div>
            <div className="text-xs text-gray-400">Total Listings Broadcast</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {allDonations.filter((d) => d.status === 'delivered').length}
            </div>
            <div className="text-xs text-emerald-400">Completed Deliveries</div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-800 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('ngos')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'ngos'
              ? 'bg-white text-emerald-900 shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          NGO Verification ({ngos.length})
        </button>
        <button
          onClick={() => setActiveSubTab('donations')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'donations'
              ? 'bg-white text-emerald-900 shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Platform Donations ({allDonations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('donors')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'donors'
              ? 'bg-white text-emerald-900 shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Food Donors ({donors.length})
        </button>
      </div>

      {/* SUB-TAB 1: NGO VERIFICATION */}
      {activeSubTab === 'ngos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NGO by name, certificate ID, or email..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
              />
            </div>
            <div className="text-xs text-gray-500">
              Only verified NGOs are authorized for expedited relief operations.
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              Loading registered NGO partners...
            </div>
          ) : filteredNgos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-500 space-y-2">
              <Building className="w-8 h-8 text-gray-400 mx-auto" />
              <div className="font-bold text-gray-800">No NGOs Registered Yet</div>
              <p>When relief agencies register with AnnaSetu AI, they will appear here for verification.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">NGO Name & Contact</th>
                      <th className="py-3 px-4">Registration Certificate</th>
                      <th className="py-3 px-4">Daily Meal Capacity</th>
                      <th className="py-3 px-4">Dietary Categories</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredNgos.map((ngo) => {
                      const isWorking = verifyingId === ngo.uid;
                      return (
                        <tr key={ngo.uid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">
                              {ngo.organization_name}
                            </div>
                            <div className="text-[11px] text-gray-500">{ngo.email}</div>
                            {ngo.phone && (
                              <div className="text-[11px] text-gray-400">{ngo.phone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">
                            {ngo.ngo_reg_number || 'Self-Attested'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-800">
                            {ngo.ngo_capacity_meals || 100} meals/day
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {ngo.ngo_dietary_types?.map((t) => (
                                <span
                                  key={t}
                                  className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded capitalize"
                                >
                                  {t.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {ngo.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Pending Audit</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {ngo.is_verified ? (
                              <button
                                onClick={() => handleToggleVerification(ngo, false)}
                                disabled={isWorking}
                                className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors"
                              >
                                {isWorking ? 'Updating...' : 'Revoke'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleVerification(ngo, true)}
                                disabled={isWorking}
                                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-2xs transition-colors"
                              >
                                {isWorking ? 'Verifying...' : 'Approve & Verify'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ALL DONATIONS AUDIT */}
      {activeSubTab === 'donations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food name, donor, or NGO..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-gray-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="collected">Collected</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Food Item</th>
                    <th className="py-3 px-4">Quantity / Servings</th>
                    <th className="py-3 px-4">Donor Kitchen</th>
                    <th className="py-3 px-4">Assigned NGO</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        AS-{d.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {d.food_name}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {d.quantity} {d.unit} (~{d.estimated_servings} servings)
                      </td>
                      <td className="py-3 px-4 text-gray-800">{d.donor_name}</td>
                      <td className="py-3 px-4 text-gray-800">
                        {d.assigned_ngo_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            d.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'collected'
                              ? 'bg-blue-100 text-blue-800'
                              : d.status === 'in_progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : d.status === 'accepted'
                              ? 'bg-amber-100 text-amber-800'
                              : d.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedDonation(d)}
                          className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FOOD DONORS */}
      {activeSubTab === 'donors' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Establishment Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donors.map((donor) => (
                  <tr key={donor.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {donor.organizationName}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-emerald-800 font-medium">
                      {donor.donorType || 'Restaurant'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{donor.email}</td>
                    <td className="py-3.5 px-4 text-gray-600">{donor.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-gray-600">{donor.address || '—'}</td>
                    <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                      {donor.createdAt ? new Date(donor.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <DonationDetailModal
        donation={selectedDonation}
        isOpen={!!selectedDonation}
        onClose={() => setSelectedDonation(null)}
      />
    </div>
  );
};
