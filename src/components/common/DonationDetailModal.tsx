import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FoodDonation, DonationStatus } from '../../types';
import { getExpiryStatus } from '../../utils/expiry';
import { formatDistance, calculateDistanceKm } from '../../utils/geo';
import { supabase, handleSupabaseError, OperationType } from '../../supabase';
import {
  X,
  Clock,
  MapPin,
  Phone,
  Building,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Package,
  Layers,
  ArrowRight,
  Truck,
  Check,
  Ban,
  FileText,
} from 'lucide-react';

interface DonationDetailModalProps {
  donation: FoodDonation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (donation: FoodDonation) => void;
  onAccept?: (donation: FoodDonation) => void;
}

export const DonationDetailModal: React.FC<DonationDetailModalProps> = ({
  donation,
  isOpen,
  onClose,
  onEdit,
  onAccept,
}) => {
  const { user, profile, isAdmin } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !donation) return null;

  const expiry = getExpiryStatus(donation.expiry_deadline || donation.expiryDeadline);
  const isDonorOwner = user?.id === donation.donor_id;
  const isAssignedNgo = user?.id === donation.assigned_ngo_id;

  // Calculate distance from current user's profile coordinates if available
  const distanceKm = calculateDistanceKm(
    donation.donorLatitude,
    donation.donorLongitude,
    profile?.latitude,
    profile?.longitude
  );

  const handleCancelDonation = async () => {
    if (!user || (!isDonorOwner && !isAdmin)) return;
    setCancelling(true);
    setError(null);

    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('donations')
        .update({
          status: 'cancelled',
          cancelled_at: nowIso,
          cancellation_reason: cancelReason || 'Cancelled by donor',
          updated_at: nowIso,
          status_history: [
            ...(donation.status_history || []),
            {
              status: 'cancelled',
              timestamp: nowIso,
              updatedBy: user.id,
              updatedByName: profile?.display_name || profile?.organization_name || 'Donor',
              notes: cancelReason || 'Listing cancelled',
            },
          ],
        })
        .eq('id', donation.id);

      if (error) throw error;

      setShowCancelPrompt(false);
      onClose();
    } catch (err) {
      console.error(err);
      handleSupabaseError(err, OperationType.UPDATE, `donations/${donation.id}`);
    } finally {
      setCancelling(false);
    }
  };

  const steps: { key: DonationStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'available', label: 'Surplus Listed', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'accepted', label: 'Accepted by NGO', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'in_progress', label: 'Pickup In Transit', icon: <Truck className="w-3.5 h-3.5" /> },
    { key: 'collected', label: 'Food Collected', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: 'delivered', label: 'Delivered & Saved', icon: <HeartHandshake className="w-3.5 h-3.5" /> },
    { key: 'completed', label: 'Rescue Complete', icon: <HeartHandshake className="w-3.5 h-3.5" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === donation.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security verification code pill */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Verification Code: AS-{donation.id.slice(-6).toUpperCase()}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                donation.status === 'delivered' || donation.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : donation.status === 'collected'
                  ? 'bg-blue-100 text-blue-800'
                  : donation.status === 'in_progress'
                  ? 'bg-indigo-100 text-indigo-800'
                  : donation.status === 'accepted'
                  ? 'bg-amber-100 text-amber-800'
                  : donation.status === 'cancelled'
                  ? 'bg-gray-200 text-gray-700'
                  : donation.status === 'expired'
                  ? 'bg-rose-200 text-rose-900'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {donation.status.replace('_', ' ')}
            </span>
          </div>

          <div
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              expiry.isExpired
                ? 'bg-rose-100 text-rose-800'
                : expiry.isCritical
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{expiry.formattedText}</span>
          </div>
        </div>

        {/* Title and Category */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            {donation.food_name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md capitalize">
              {donation.category.replace('_', ' ')}
            </span>
            <span>•</span>
            <span className="font-bold text-gray-800">
              {donation.quantity} {donation.unit} (~{donation.estimated_servings} servings)
            </span>
            {distanceKm !== null && (
              <>
                <span>•</span>
                <span className="text-emerald-700 font-medium">
                  {formatDistance(distanceKm)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status Stepper Progression */}
        {donation.status !== 'cancelled' ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-semibold text-gray-700 mb-3">
              Surplus Food Rescue Progression
            </div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {steps.map((s, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div key={s.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                        isPassed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] leading-tight font-medium ${
                        isCurrent
                          ? 'text-emerald-800 font-bold'
                          : isPassed
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Donation Cancelled: </span>
              <span>{donation.cancellation_reason || 'Cancelled by donor.'}</span>
            </div>
          </div>
        )}

        {/* Dietary & Hygiene specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
          <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-2">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Dietary Profile & Ingredients</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {donation.dietary_info && donation.dietary_info.length > 0 ? (
                donation.dietary_info.map((d) => (
                  <span
                    key={d}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-medium capitalize"
                  >
                    {d.replace('_', ' ')}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">Standard dietary</span>
              )}
            </div>
            <div className="text-gray-600 pt-1">
              <span className="font-medium text-gray-700">Packaging: </span>
              <span>{donation.packaging_condition}</span>
            </div>
            {donation.storage_instructions && (
              <div className="text-gray-600">
                <span className="font-medium text-gray-700">Storage: </span>
                <span>{donation.storage_instructions}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-2">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Safety & Timing Timeline</span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium text-gray-700">Prepared: </span>
              <span>{new Date(donation.preparation_time || donation.preparationTime).toLocaleString()}</span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium text-gray-700">Expiry Deadline: </span>
              <span className="font-semibold text-rose-700">
                {new Date(donation.expiry_deadline || donation.expiryDeadline).toLocaleString()}
              </span>
            </div>
            {donation.notes && (
              <div className="text-gray-600 pt-1">
                <span className="font-medium text-gray-700">Pickup Notes: </span>
                <span>{donation.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Parties involved: Donor & NGO details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
          {/* Donor Box */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Food Donor / Kitchen</span>
            </div>
            <div className="text-sm font-bold text-gray-800">{donation.donor_name}</div>
            <div className="flex items-start gap-1.5 text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{donation.donor_address}</span>
            </div>
            {donation.donor_phone && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <a
                  href={`tel:${donation.donor_phone}`}
                  className="text-emerald-700 font-medium hover:underline"
                >
                  {donation.donor_phone}
                </a>
              </div>
            )}
          </div>

          {/* NGO Box */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-emerald-700" />
              <span>Assigned Relief NGO</span>
            </div>
            {donation.assigned_ngo_name ? (
              <>
                <div className="text-sm font-bold text-gray-800">
                  {donation.assigned_ngo_name}
                </div>
                {donation.assigned_ngo_phone && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`tel:${donation.assigned_ngo_phone}`}
                      className="text-emerald-700 font-medium hover:underline"
                    >
                      {donation.assigned_ngo_phone}
                    </a>
                  </div>
                )}
                {donation.accepted_at && (
                  <div className="text-[11px] text-gray-500">
                    Accepted on {new Date(donation.accepted_at).toLocaleTimeString()}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400 italic pt-2">
                Not yet assigned. Awaiting nearby verified NGO claim.
              </div>
            )}
          </div>
        </div>

        {/* Genuine Status History Logs */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Immutable Lifecycle Audit Trail</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 divide-y divide-gray-100 max-h-40 overflow-y-auto text-xs">
            {donation.status_history && donation.status_history.length > 0 ? (
              donation.status_history.map((item, idx) => (
                <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-gray-800 capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                    {item.updatedByName && (
                      <span className="text-gray-500 ml-1.5">
                        by {item.updatedByName}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">No log entries available.</div>
            )}
          </div>
        </div>

        {/* Cancellation Prompt */}
        {showCancelPrompt && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
            <div className="font-bold text-rose-900">
              Confirm Cancellation of Surplus Food Listing
            </div>
            <p className="text-rose-700">
              Please specify the reason for cancellation (e.g. food consumed internally, spoiled, or safety concern):
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full px-3 py-1.5 border border-rose-300 rounded-lg bg-white text-xs text-gray-800"
            />
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowCancelPrompt(false)}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelDonation}
                disabled={cancelling}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            {isDonorOwner && donation.status === 'available' && !showCancelPrompt && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-medium transition-colors"
                >
                  Cancel Listing
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(donation);
                    }}
                    className="px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-xl font-medium transition-colors"
                  >
                    Edit Listing
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {profile?.role === 'ngo' && donation.status === 'available' && !expiry.isExpired && onAccept && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAccept(donation);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Surplus Food for Rescue</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for icon
function HeartHandshake(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
