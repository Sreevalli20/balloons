import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FoodDonation, FoodCategory, DonationStatus } from '../../types';
import { calculateMatchScore } from '../../utils/matching';
import { getExpiryStatus } from '../../utils/expiry';
import { formatDistance, calculateDistanceKm } from '../../utils/geo';
import { DonationDetailModal } from '../common/DonationDetailModal';
import {
  getAvailableDonations,
  getDonationsByAssignedNgoId,
  updateDonation,
  getDonationById,
  updateUser,
} from '../../services/localStorage';
import {
  HeartHandshake,
  Sparkles,
  MapPin,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  Truck,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
  Phone,
  AlertTriangle,
  Info,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';

interface NgoDashboardProps {
  openAuthModal: () => void;
}

export const NgoDashboard: React.FC<NgoDashboardProps> = ({ openAuthModal }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'my_pickups'>('available');

  const [availableDonations, setAvailableDonations] = useState<FoodDonation[]>([]);
  const [myPickups, setMyPickups] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'match' | 'distance' | 'urgency' | 'servings'>('match');

  // Modals & Action States
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [verifyingSelf, setVerifyingSelf] = useState(false);

  // Delivery confirmation modal
  const [deliveryDonation, setDeliveryDonation] = useState<FoodDonation | null>(null);
  const [beneficiariesServed, setBeneficiariesServed] = useState<number>(50);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  const handleFastTrackVerify = async () => {
    if (!user) return;
    setVerifyingSelf(true);
    setActionError(null);
    try {
      updateUser(user.id, { isVerified: true });
      setActionSuccess('Agency status verified! You now have full clearance to accept surplus food donations.');
    } catch (err: unknown) {
      console.error(err);
      setActionError('Failed to verify NGO account');
    } finally {
      setVerifyingSelf(false);
    }
  };

  // Load available donations from localStorage
  useEffect(() => {
    const loadAvailableDonations = () => {
      const available = getAvailableDonations();
      setAvailableDonations(available);
      setLoading(false);
    };

    loadAvailableDonations();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'annasetu_donations') {
        loadAvailableDonations();
      }
    };

    const handleCustomEvent = () => {
      loadAvailableDonations();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('annasetu-donations-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('annasetu-donations-updated', handleCustomEvent);
    };
  }, []);

  // Load pickups assigned to this NGO from localStorage
  useEffect(() => {
    if (!user) {
      setMyPickups([]);
      return;
    }

    const loadMyPickups = () => {
      const pickups = getDonationsByAssignedNgoId(user.id);
      setMyPickups(pickups);
    };

    loadMyPickups();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'annasetu_donations') {
        loadMyPickups();
      }
    };

    const handleCustomEvent = () => {
      loadMyPickups();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('annasetu-donations-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('annasetu-donations-updated', handleCustomEvent);
    };
  }, [user]);

  // Synchronize modal donation if updated
  useEffect(() => {
    if (selectedDonation) {
      const match =
        availableDonations.find((d) => d.id === selectedDonation.id) ||
        myPickups.find((d) => d.id === selectedDonation.id);
      if (match) setSelectedDonation(match);
    }
  }, [availableDonations, myPickups, selectedDonation]);

  // Handle Accept Donation
  const handleAcceptDonation = async (donation: FoodDonation) => {
    if (!user || !profile) {
      openAuthModal();
      return;
    }

    if (profile.role === 'ngo' && !profile.isVerified) {
      setActionError(
        'Verification Required: Your NGO registration is in initial unverified status. Administrator certification is required to claim surplus food. Please review the verification protocol banner above or use the Fast-Track simulation button to activate your account.'
      );
      return;
    }

    const expiry = getExpiryStatus(donation.expiryDeadline);
    if (expiry.isExpired) {
      setActionError('This donation has expired and cannot be accepted for food safety reasons.');
      return;
    }

    setAcceptingId(donation.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Check if donation is still available
      const currentDonation = getDonationById(donation.id);
      if (!currentDonation || currentDonation.status !== 'available') {
        setActionError('This donation is no longer available.');
        return;
      }

      // Update donation with NGO assignment
      const nowIso = new Date().toISOString();
      updateDonation(donation.id, {
        status: 'accepted',
        assignedNgoId: user.id,
        assigned_ngo_id: user.id,
        assignedNgoName: profile.organizationName || profile.displayName || 'Relief NGO',
        assigned_ngo_name: profile.organizationName || profile.displayName || 'Relief NGO',
        assignedNgoPhone: profile.phone || '',
        assigned_ngo_phone: profile.phone || '',
        acceptedAt: nowIso,
        accepted_at: nowIso,
        statusHistory: [
          ...(donation.statusHistory || []),
          {
            status: 'accepted',
            timestamp: nowIso,
            updatedBy: user.id,
            updatedByName: profile.organizationName || 'Relief NGO',
            notes: 'Donation accepted by NGO for pickup',
          },
        ],
      });

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('annasetu-donations-updated'));

      setActionSuccess(`Successfully accepted ${donation.foodName}! Pickup assigned to your roster.`);
      setActiveTab('my_pickups');
    } catch (err: unknown) {
      console.error(err);
      setActionError('Failed to accept donation');
    } finally {
      setAcceptingId(null);
    }
  };

  // Status transitions for NGO
  const handleTransitionStatus = async (
    donation: FoodDonation,
    newStatus: DonationStatus,
    customNotes?: string
  ) => {
    if (!user) return;
    setActionError(null);

    const nowIso = new Date().toISOString();
    const updateData: Partial<FoodDonation> = {
      status: newStatus,
    };

    if (newStatus === 'in_progress') {
      updateData.statusHistory = [
        ...(donation.statusHistory || []),
        {
          status: 'in_progress',
          timestamp: nowIso,
          updatedBy: user.id,
          updatedByName: profile?.organizationName || 'NGO Driver',
          notes: customNotes || 'Pickup vehicle en route to donor address.',
        },
      ];
    } else if (newStatus === 'collected') {
      updateData.collectedAt = nowIso;
      updateData.collected_at = nowIso;
      updateData.statusHistory = [
        ...(donation.statusHistory || []),
        {
          status: 'collected',
          timestamp: nowIso,
          updatedBy: user.id,
          updatedByName: profile?.organizationName || 'NGO Team',
          notes: customNotes || 'Surplus food securely inspected and loaded for distribution.',
        },
      ];
    }

    try {
      updateDonation(donation.id, updateData);
      window.dispatchEvent(new CustomEvent('annasetu-donations-updated'));
      setActionSuccess(`Status updated to: ${newStatus.replace('_', ' ')}`);
    } catch (err: unknown) {
      console.error(err);
      setActionError('Failed to update status');
    }
  };

  // Confirm delivery
  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDonation || !user) return;

    setSubmittingDelivery(true);
    const nowIso = new Date().toISOString();

    try {
      updateDonation(deliveryDonation.id, {
        status: 'delivered',
        deliveredAt: nowIso,
        delivered_at: nowIso,
        actualBeneficiariesServed: Number(beneficiariesServed),
        actual_beneficiaries_served: Number(beneficiariesServed),
        statusHistory: [
          ...(deliveryDonation.statusHistory || []),
          {
            status: 'delivered',
            timestamp: nowIso,
            updatedBy: user.id,
            updatedByName: profile?.organizationName || 'NGO Team',
            notes:
              deliveryNotes ||
              `Food served to ${beneficiariesServed} beneficiaries at community shelter.`,
          },
        ],
      });

      window.dispatchEvent(new CustomEvent('annasetu-donations-updated'));

      setActionSuccess(
        `Rescue completed! Verified impact: ${beneficiariesServed} meals provided to beneficiaries.`
      );
      setDeliveryDonation(null);
    } catch (err: unknown) {
      console.error(err);
      setActionError('Failed to confirm delivery');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  // Filter & calculate match scores for available donations
  const matchedDonations = availableDonations.map((donation) => {
    const match = profile
      ? calculateMatchScore(donation, profile)
      : {
          totalScore: 70,
          distanceKm: calculateDistanceKm(
            donation.donorLatitude || donation.donor_latitude,
            donation.donorLongitude || donation.donor_longitude,
            12.9352,
            77.6245
          ),
          distanceScore: 20,
          capacityScore: 20,
          urgencyScore: 15,
          dietaryScore: 15,
          reasons: ['Baseline compatibility calculated.'],
        };
    return { donation, match };
  });

  // Apply filters
  const filteredDonations = matchedDonations.filter(({ donation }) => {
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      const matchFood = donation.foodName.toLowerCase().includes(queryLower);
      const matchDonor = donation.donorName.toLowerCase().includes(queryLower);
      const matchAddress = donation.donorAddress.toLowerCase().includes(queryLower);
      if (!matchFood && !matchDonor && !matchAddress) return false;
    }

    if (categoryFilter !== 'all' && donation.category !== categoryFilter) {
      return false;
    }

    if (urgentOnly) {
      const expiry = getExpiryStatus(donation.expiryDeadline);
      if (expiry.remainingHours > 3 || expiry.isExpired) return false;
    }

    return true;
  });

  // Apply sorting
  filteredDonations.sort((a, b) => {
    if (sortBy === 'match') {
      return b.match.totalScore - a.match.totalScore;
    }
    if (sortBy === 'distance') {
      const distA = a.match.distanceKm ?? 9999;
      const distB = b.match.distanceKm ?? 9999;
      return distA - distB;
    }
    if (sortBy === 'urgency') {
      const expiryA = a.donation.expiry_deadline || a.donation.expiryDeadline;
      const expiryB = b.donation.expiry_deadline || b.donation.expiryDeadline;
      return new Date(expiryA || 0).getTime() - new Date(expiryB || 0).getTime();
    }
    if (sortBy === 'servings') {
      const servingsA = a.donation.estimated_servings || a.donation.estimatedServings || 0;
      const servingsB = b.donation.estimated_servings || b.donation.estimatedServings || 0;
      return servingsB - servingsA;
    }
    return 0;
  });

  const activeAssignedPickups = myPickups.filter((d) =>
    !['delivered', 'completed', 'cancelled', 'expired'].includes(d.status)
  );
  const deliveredPickups = myPickups.filter((d) =>
    ['delivered', 'completed'].includes(d.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* NGO Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>NGO Food Rescue & Distribution Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile?.organizationName || profile?.organization_name || 'Relief NGO Mission Network'}
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              Inspect surplus food listings from local restaurants, caterers, and grocers.
              Our Smart Matching Engine pairs donations with your capacity, route, and
              urgency in real time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {profile && (
              <div className="bg-emerald-800/60 border border-emerald-700/60 rounded-2xl p-4 text-xs space-y-1">
                <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {profile.isVerified ? 'Verified Relief Partner' : 'Verification Pending'}
                  </span>
                </div>
                <div>Capacity: {profile.ngoCapacityMeals || profile.ngo_capacity_meals || 100} meals/day</div>
                <div className="text-emerald-200/80 truncate max-w-[200px]">
                  HQ: {profile.address || 'Address set'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tabs inside banner */}
        <div className="mt-8 pt-6 border-t border-emerald-800/80 flex flex-wrap gap-4 text-xs">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'available'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/50 text-emerald-100 hover:bg-emerald-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Available Surplus Feeds ({availableDonations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('my_pickups')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeTab === 'my_pickups'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/50 text-emerald-100 hover:bg-emerald-800'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>
              My Pickups & Rescues ({activeAssignedPickups.length} active / {deliveredPickups.length} saved)
            </span>
          </button>
        </div>
      </div>

      {/* UNVERIFIED NGO INITIAL STATE & BACKEND VERIFICATION LOGIC */}
      {user && profile?.role === 'ngo' && !profile?.isVerified && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-6 sm:p-7 text-amber-950 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-amber-950">
                    NGO Account Status: Initial Verification Pending
                  </h3>
                  <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full tracking-wider">
                    Under Administrator Review
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Your NGO registration credentials have been submitted. Food rescue claim privileges are locked until verified.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFastTrackVerify}
              disabled={verifyingSelf}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>{verifyingSelf ? 'Verifying in Firestore...' : 'Simulate Administrator Verification / Fast-Track'}</span>
            </button>
          </div>

          {/* Registration Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-white/85 p-3 rounded-xl border border-amber-200">
              <div className="text-[10px] text-amber-700 font-semibold uppercase">NGO Legal Name</div>
              <div className="font-bold text-gray-900 mt-0.5">{profile.organizationName}</div>
            </div>
            <div className="bg-white/85 p-3 rounded-xl border border-amber-200">
              <div className="text-[10px] text-amber-700 font-semibold uppercase">Registration / Certificate ID</div>
              <div className="font-mono font-bold text-gray-900 mt-0.5">{profile.ngoRegNumber || 'Certificate Pending'}</div>
            </div>
            <div className="bg-white/85 p-3 rounded-xl border border-amber-200">
              <div className="text-[10px] text-amber-700 font-semibold uppercase">Distribution Capacity</div>
              <div className="font-bold text-gray-900 mt-0.5">{profile.ngoCapacityMeals || 100} meals/day</div>
            </div>
          </div>

          {/* Backend Logic & Administrator Verification Workflow Outline */}
          <div className="bg-amber-100/60 rounded-2xl p-4 border border-amber-200/80 text-xs space-y-2.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-amber-800" />
              <span>Backend Verification Architecture & FSSAI Food Safety Compliance</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              To prevent distribution of spoiled food and protect recipient communities, AnnaSetu AI requires platform administrator verification prior to granting donation acceptance privileges:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] pt-1">
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-gray-900">1. Certificate Cross-Check</div>
                <div className="text-gray-600">Administrator validates Society/Trust deed and NITI Aayog NGO Darpan registration ID against official government registries.</div>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-gray-900">2. Sanitary Chain Audit</div>
                <div className="text-gray-600">Verifies recipient agency maintains temperature-controlled thermal bags (&gt;60°C hot holding, &lt;5°C chilling) for safe transit.</div>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-gray-900">3. Firestore RBAC Mutation</div>
                <div className="text-gray-600">Admin authorizes the agency in <code className="font-mono font-bold text-emerald-800">/admin</code>, updating <code className="font-mono font-bold text-emerald-800">isVerified: true</code> in Cloud Firestore to unlock full rescue functionality.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
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
            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: AVAILABLE DONATIONS */}
      {activeTab === 'available' && (
        <div className="space-y-6">
          {/* Filter & Sort Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food item, donor name, or locality..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-gray-700 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="cooked_meals">Cooked Meals</option>
                <option value="fresh_produce">Fresh Produce</option>
                <option value="packaged_goods">Packaged Goods</option>
                <option value="bakery">Bakery & Breads</option>
                <option value="dairy">Dairy & Desserts</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'match' | 'distance' | 'urgency' | 'servings'
                  )
                }
                className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-gray-700 bg-white"
              >
                <option value="match">Sort by: Best Smart Match</option>
                <option value="distance">Sort by: Nearest First</option>
                <option value="urgency">Sort by: Expiring Soonest</option>
                <option value="servings">Sort by: Largest Quantity</option>
              </select>

              {/* Expiring Soon Toggle */}
              <button
                type="button"
                onClick={() => setUrgentOnly(!urgentOnly)}
                className={`px-3 py-2 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${
                  urgentOnly
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Expiring Soon (&lt; 3h)</span>
              </button>
            </div>
          </div>

          {/* Cards Feed */}
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2" />
              <div>Fetching live surplus food listings...</div>
            </div>
          ) : filteredDonations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  No Available Surplus Food Listings Matching Criteria
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {availableDonations.length === 0
                    ? 'There are currently no active surplus food listings in the network. New listings from local restaurants and banquets will appear here in real time.'
                    : 'Try clearing your category or urgent filters to see other active listings.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDonations.map(({ donation, match }) => {
                const expiry = getExpiryStatus(donation.expiry_deadline || donation.expiryDeadline || '');
                const isAccepting = acceptingId === donation.id;

                return (
                  <div
                    key={donation.id}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all p-5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Match Score & Expiry Countdown */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Smart Match Pill */}
                        <div
                          title={match.reasons.join('\n')}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${
                            match.totalScore >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : match.totalScore >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{match.totalScore}% Match</span>
                        </div>

                        {/* Live Expiry Countdown */}
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            expiry.isExpired
                              ? 'bg-rose-100 text-rose-800'
                              : expiry.isCritical
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{expiry.formattedText}</span>
                        </span>
                      </div>

                      {/* Food Title & Servings */}
                      <div>
                        <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                          {donation.foodName}
                        </h3>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                            {donation.category.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-gray-800">
                            {donation.quantity} {donation.unit} (~{donation.estimatedServings} servings)
                          </span>
                        </div>
                      </div>

                      {/* Donor info & distance */}
                      <div className="p-2.5 bg-gray-50 rounded-xl text-xs space-y-1">
                        <div className="font-semibold text-gray-800 flex items-center justify-between">
                          <span className="truncate">{donation.donorName}</span>
                          {match.distanceKm !== null && (
                            <span className="text-emerald-700 font-bold shrink-0">
                              {formatDistance(match.distanceKm)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-1 text-gray-500 text-[11px]">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{donation.donorAddress}</span>
                        </div>
                      </div>

                      {/* Match reasons breakdown */}
                      <div className="text-[11px] text-gray-500 line-clamp-2 italic">
                        {match.reasons[0] || 'Standard compatibility'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 mt-4 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDonation(donation)}
                        className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleAcceptDonation(donation)}
                        disabled={isAccepting || expiry.isExpired}
                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                          expiry.isExpired
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isAccepting ? (
                          <span>Assigning...</span>
                        ) : expiry.isExpired ? (
                          <span>Expired</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept for Rescue</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY PICKUPS & RESCUES */}
      {activeTab === 'my_pickups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Assigned Pickups & Active Rescues
            </h2>
            <div className="text-xs text-gray-500">
              Live progression status updates reflect on donor portal automatically
            </div>
          </div>

          {!user ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <p className="text-xs text-gray-500">
                Sign in to view and manage food rescue pickups assigned to your NGO.
              </p>
              <button
                onClick={openAuthModal}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Sign In as NGO
              </button>
            </div>
          ) : myPickups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No Pickups Claimed Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Explore available surplus food listings and click &quot;Accept for Rescue&quot; to assign
                the pickup to your agency.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Browse Available Food Listings
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myPickups.map((donation) => {
                const expiry = getExpiryStatus(donation.expiry_deadline || donation.expiryDeadline || '');
                return (
                  <div
                    key={donation.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {donation.food_name || donation.foodName}
                          </h3>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              donation.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : donation.status === 'collected'
                                ? 'bg-blue-100 text-blue-800'
                                : donation.status === 'in_progress'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {donation.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <span>
                            {donation.quantity} {donation.unit} (~{donation.estimatedServings} servings)
                          </span>
                          <span>•</span>
                          <span>From: {donation.donorName}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-gray-400">
                            Code: AS-{donation.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDonation(donation)}
                          className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700"
                        >
                          View Audit Details
                        </button>
                      </div>
                    </div>

                    {/* Step-by-step Pickup Controller */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span>Pickup Address: {donation.donorAddress}</span>
                        </div>
                        {donation.donorPhone && (
                          <div className="text-xs text-gray-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>Donor Contact: </span>
                            <a
                              href={`tel:${donation.donorPhone}`}
                              className="text-emerald-700 font-semibold hover:underline"
                            >
                              {donation.donorPhone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex items-center gap-2">
                        {donation.status === 'accepted' && (
                          <button
                            onClick={() => handleTransitionStatus(donation, 'in_progress')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Start Pickup (En Route)</span>
                          </button>
                        )}

                        {donation.status === 'in_progress' && (
                          <button
                            onClick={() => handleTransitionStatus(donation, 'collected')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Confirm Food Collected</span>
                          </button>
                        )}

                        {donation.status === 'collected' && (
                          <button
                            onClick={() => {
                              setDeliveryDonation(donation);
                              setBeneficiariesServed(donation.estimatedServings || 50);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm Food Delivered</span>
                          </button>
                        )}

                        {donation.status === 'delivered' && (
                          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              Delivered to {donation.actualBeneficiariesServed || donation.estimatedServings} Beneficiaries
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {deliveryDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm Food Delivery & Beneficiary Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Record genuine delivery metrics for {deliveryDonation.foodName}. This update
              is permanently written to the live impact ledger.
            </p>

            <form onSubmit={handleConfirmDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Actual Beneficiaries Fed (Meals Distributed) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={beneficiariesServed}
                  onChange={(e) => setBeneficiariesServed(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Distribution Notes / Shelter Location
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Distributed to families at Indiranagar Community Center."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryDonation(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelivery}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {submittingDelivery ? 'Recording to Firestore...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donation Detail Modal */}
      <DonationDetailModal
        donation={selectedDonation}
        isOpen={!!selectedDonation}
        onClose={() => setSelectedDonation(null)}
        onAccept={handleAcceptDonation}
      />
    </div>
  );
};
