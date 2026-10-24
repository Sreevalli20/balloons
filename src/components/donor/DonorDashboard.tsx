import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, handleSupabaseError, OperationType } from '../../supabase';
import { FoodDonation, DonationStatus } from '../../types';
import { getExpiryStatus } from '../../utils/expiry';
import { CreateDonationForm } from './CreateDonationForm';
import { DonationFormModal } from './DonationFormModal';
import { DonationDetailModal } from '../common/DonationDetailModal';
import {
  Plus,
  Utensils,
  Clock,
  MapPin,
  CheckCircle2,
  Truck,
  HeartHandshake,
  AlertCircle,
  Eye,
  Edit2,
  XCircle,
  Sparkles,
  Package,
} from 'lucide-react';

interface DonorDashboardProps {
  openAuthModal: () => void;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({ openAuthModal }) => {
  const { user, profile } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [donationToEdit, setDonationToEdit] = useState<FoodDonation | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Supabase real-time listener for current donor's donations
  useEffect(() => {
    if (!user) {
      setDonations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch
    const fetchDonations = async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'donations');
        setLoading(false);
        return;
      }

      if (data) {
        setDonations(data as FoodDonation[]);
      }
      setLoading(false);
    };

    fetchDonations();

    // Set up real-time subscription
    const channel = supabase
      .channel('donations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `donor_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDonations((prev) => [payload.new as FoodDonation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDonations((prev) =>
              prev.map((d) =>
                d.id === payload.new.id ? (payload.new as FoodDonation) : d
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setDonations((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Keep selectedDonation synced with live data
  useEffect(() => {
    if (selectedDonation) {
      const updated = donations.find((d) => d.id === selectedDonation.id);
      if (updated) setSelectedDonation(updated);
    }
  }, [donations, selectedDonation]);

  const activeDonations = donations.filter((d) =>
    ['available', 'accepted', 'in_progress', 'collected'].includes(d.status)
  );
  const completedDonations = donations.filter((d) =>
    ['delivered', 'completed'].includes(d.status)
  );
  const cancelledDonations = donations.filter((d) =>
    ['cancelled', 'expired'].includes(d.status)
  );

  const displayedDonations =
    filterTab === 'active'
      ? activeDonations
      : filterTab === 'completed'
      ? completedDonations
      : cancelledDonations;

  const totalMealsRescuedByDonor = completedDonations.reduce(
    (sum, d) => sum + (d.estimatedServings || d.quantity || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Donor Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-700/50 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
              <Utensils className="w-3.5 h-3.5" />
              <span>Food Donor & Kitchen Management Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile?.organization_name || 'Surplus Food Donor Portal'}
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              Post fresh surplus food from your kitchens, banquets, and stores. Connect
              with certified NGOs for prompt collection before expiry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInlineCreate((prev) => !prev)}
                  className="px-5 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-bold text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{showInlineCreate ? 'Hide Create Form' : 'Create Donation Form'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-6 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <span>Sign In to Post Food</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-8 pt-6 border-t border-emerald-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-black text-white">{activeDonations.length}</div>
            <div className="text-xs text-emerald-200">Active Listings in Network</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{completedDonations.length}</div>
            <div className="text-xs text-emerald-200">Successful Pickups Completed</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalMealsRescuedByDonor}</div>
            <div className="text-xs text-emerald-200">Total Meals Rescued</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {(totalMealsRescuedByDonor * 0.4 * 2.5).toFixed(1)} kg
            </div>
            <div className="text-xs text-emerald-200">CO2 Emissions Prevented</div>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inline Create Donation Form */}
      {showInlineCreate && user && (
        <div className="mb-6">
          <CreateDonationForm
            isInline={true}
            onSuccess={(newDonation) => {
              setShowInlineCreate(false);
              setSuccessNotice(
                `Surplus food listing "${newDonation.foodName}" successfully published to Cloud Firestore! Eligible nearby NGOs can now view and claim it.`
              );
              setFilterTab('active');
            }}
            onCancel={() => setShowInlineCreate(false)}
          />
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilterTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'active'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Listings ({activeDonations.length})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'completed'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed Rescues ({completedDonations.length})
          </button>
          <button
            onClick={() => setFilterTab('cancelled')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'cancelled'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cancelled ({cancelledDonations.length})
          </button>
        </div>

        {user && (
          <button
            onClick={() => {
              setDonationToEdit(null);
              setIsFormOpen(true);
            }}
            className="sm:hidden px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Post Surplus Food</span>
          </button>
        )}
      </div>

      {/* Listings Grid */}
      {!user ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
            <Utensils className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">
              Sign In to Access Your Food Donor Dashboard
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Register as a restaurant, caterer, bakery, or pantry to publish surplus
              food listings and monitor real-time pickups.
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Sign In / Register as Donor
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-gray-500">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2" />
          <div>Synchronizing real-time listings from Firestore...</div>
        </div>
      ) : displayedDonations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">
              {filterTab === 'active'
                ? 'No Active Surplus Food Listings'
                : filterTab === 'completed'
                ? 'No Completed Pickups Yet'
                : 'No Cancelled Listings'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {filterTab === 'active'
                ? 'You have no active food donations at the moment. Post surplus meals from today’s prep to prevent food waste.'
                : filterTab === 'completed'
                ? 'Completed food rescue pickups will be logged here with verified delivery records.'
                : 'Any cancelled listings will be archived here.'}
            </p>
          </div>
          {filterTab === 'active' && (
            <button
              onClick={() => {
                setDonationToEdit(null);
                setIsFormOpen(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Post First Surplus Meal Listing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDonations.map((donation) => {
            const expiry = getExpiryStatus(donation.expiryDeadline);
            return (
              <div
                key={donation.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Status & Expiry */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        donation.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : donation.status === 'collected'
                          ? 'bg-blue-100 text-blue-800'
                          : donation.status === 'in_progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : donation.status === 'accepted'
                          ? 'bg-amber-100 text-amber-800'
                          : donation.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {donation.status.replace('_', ' ')}
                    </span>

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

                  {/* Food Title & Category */}
                  <div>
                    <h3 className="font-bold text-base text-gray-900 line-clamp-1">
                      {donation.foodName}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                        {donation.category.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-gray-800">
                        {donation.quantity} {donation.unit} (~{donation.estimatedServings} servings)
                      </span>
                    </div>
                  </div>

                  {/* Dietary tags */}
                  <div className="flex flex-wrap gap-1">
                    {donation.dietaryInfo?.map((d) => (
                      <span
                        key={d}
                        className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded capitalize"
                      >
                        {d.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* NGO Assignment Status if Accepted */}
                  {donation.assignedNgoName ? (
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs space-y-1">
                      <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Accepted by: {donation.assignedNgoName}</span>
                      </div>
                      {donation.assignedNgoPhone && (
                        <div className="text-[11px] text-emerald-800">
                          Contact: {donation.assignedNgoPhone}
                        </div>
                      )}
                      <div className="text-[10px] text-emerald-700 font-medium capitalize">
                        Pickup Status: {donation.status.replace('_', ' ')}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-500">
                      Broadcasting to nearby verified relief NGOs...
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{donation.donorAddress}</span>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedDonation(donation)}
                    className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-600" />
                    <span>View Details</span>
                  </button>

                  {donation.status === 'available' && (
                    <button
                      onClick={() => {
                        setDonationToEdit(donation);
                        setIsFormOpen(true);
                      }}
                      title="Edit Listing"
                      className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <DonationFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setDonationToEdit(null);
        }}
        donationToEdit={donationToEdit}
      />

      {/* Detail Modal */}
      <DonationDetailModal
        donation={selectedDonation}
        isOpen={!!selectedDonation}
        onClose={() => setSelectedDonation(null)}
        onEdit={(d) => {
          setSelectedDonation(null);
          setDonationToEdit(d);
          setIsFormOpen(true);
        }}
      />
    </div>
  );
};
