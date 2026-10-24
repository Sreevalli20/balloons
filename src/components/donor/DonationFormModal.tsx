import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FoodDonation,
  FoodCategory,
  QuantityUnit,
  DietaryType,
  DonationStatus,
} from '../../types';
import { CITY_PRESETS, getCurrentBrowserLocation } from '../../utils/geo';
import { updateDonation, createDonation } from '../../services/supabaseData';
import {
  X,
  Utensils,
  Clock,
  MapPin,
  Compass,
  AlertTriangle,
  Info,
  Calendar,
  Check,
} from 'lucide-react';

interface DonationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationToEdit?: FoodDonation | null;
}

export const DonationFormModal: React.FC<DonationFormModalProps> = ({
  isOpen,
  onClose,
  donationToEdit,
}) => {
  const { user, profile } = useAuth();

  // Helper to format Date into datetime-local string
  const formatDatetimeLocal = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const defaultPrep = formatDatetimeLocal(new Date(Date.now() - 60 * 60 * 1000)); // 1 hr ago
  const defaultExp = formatDatetimeLocal(new Date(Date.now() + 5 * 60 * 60 * 1000)); // 5 hrs from now

  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('cooked_meals');
  const [quantity, setQuantity] = useState<number>(30);
  const [unit, setUnit] = useState<QuantityUnit>('meals');
  const [estimatedServings, setEstimatedServings] = useState<number>(30);
  const [dietaryInfo, setDietaryInfo] = useState<DietaryType[]>(['veg']);
  const [packagingCondition, setPackagingCondition] = useState('Hot-sealed food-grade insulated containers');
  const [storageInstructions, setStorageInstructions] = useState('Keep warm above 60°C or consume within 4 hours');
  const [preparationTime, setPreparationTime] = useState(defaultPrep);
  const [expiryDeadline, setExpiryDeadline] = useState(defaultExp);
  const [pickupAddress, setPickupAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9352);
  const [longitude, setLongitude] = useState<number>(77.6245);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if editing
  useEffect(() => {
    if (donationToEdit) {
      setFoodName(donationToEdit.food_name || donationToEdit.foodName || '');
      setCategory(donationToEdit.category);
      setQuantity(donationToEdit.quantity || 0);
      setUnit(donationToEdit.unit);
      setEstimatedServings(donationToEdit.estimated_servings || donationToEdit.estimatedServings || 0);
      setDietaryInfo(donationToEdit.dietary_info || donationToEdit.dietaryInfo || ['veg']);
      setPackagingCondition(donationToEdit.packaging_condition || donationToEdit.packagingCondition || '');
      setStorageInstructions(donationToEdit.storage_instructions || donationToEdit.storageInstructions || '');
      setPreparationTime(
        donationToEdit.preparation_time || donationToEdit.preparationTime
          ? formatDatetimeLocal(new Date(donationToEdit.preparation_time || donationToEdit.preparationTime))
          : defaultPrep
      );
      setExpiryDeadline(
        donationToEdit.expiry_deadline || donationToEdit.expiryDeadline
          ? formatDatetimeLocal(new Date(donationToEdit.expiry_deadline || donationToEdit.expiryDeadline))
          : defaultExp
      );
      setPickupAddress(donationToEdit.donor_address || donationToEdit.donorAddress || '');
      setLatitude(donationToEdit.donor_latitude || donationToEdit.donorLatitude || 12.9352);
      setLongitude(donationToEdit.donor_longitude || donationToEdit.donorLongitude || 77.6245);
      setNotes(donationToEdit.notes || '');
    } else if (profile) {
      setPickupAddress(profile.address || '');
      if (profile.latitude) setLatitude(profile.latitude);
      if (profile.longitude) setLongitude(profile.longitude);
    }
  }, [donationToEdit, profile, isOpen]);

  // Auto update estimated servings when quantity changes for meals
  const handleQuantityChange = (val: number) => {
    setQuantity(val);
    if (unit === 'meals' || unit === 'portions') {
      setEstimatedServings(val);
    } else if (unit === 'kg') {
      // average ~350-400g per meal
      setEstimatedServings(Math.round(val * 2.5));
    } else if (unit === 'boxes') {
      setEstimatedServings(val * 4);
    }
  };

  const toggleDietary = (item: DietaryType) => {
    setDietaryInfo((prev) =>
      prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
    );
  };

  const handleDetectGPS = async () => {
    setLocating(true);
    setError(null);
    try {
      const coords = await getCurrentBrowserLocation();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      if (!pickupAddress) {
        setPickupAddress(`GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Could not detect browser location.'
      );
    } finally {
      setLocating(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to post a donation.');
      return;
    }

    const prepDate = new Date(preparationTime);
    const expDate = new Date(expiryDeadline);
    const now = new Date();

    if (isNaN(prepDate.getTime()) || isNaN(expDate.getTime())) {
      setError('Please provide valid preparation and expiry timestamps.');
      return;
    }

    if (expDate <= now) {
      setError('Expiry deadline must be strictly in the future.');
      return;
    }

    if (expDate <= prepDate) {
      setError('Expiry deadline must be after preparation time.');
      return;
    }

    if (quantity <= 0 || estimatedServings <= 0) {
      setError('Quantity and estimated servings must be positive numbers.');
      return;
    }

    setSubmitting(true);
    const nowIso = now.toISOString();

    try {
      if (donationToEdit) {
        // Update existing donation
        updateDonation(donationToEdit.id, {
          food_name: foodName,
          foodName,
          category,
          quantity: Number(quantity),
          unit,
          estimated_servings: Number(estimatedServings),
          estimatedServings: Number(estimatedServings),
          dietary_info: dietaryInfo,
          dietaryInfo,
          packaging_condition: packagingCondition,
          packagingCondition,
          storage_instructions: storageInstructions,
          storageInstructions,
          preparation_time: prepDate.toISOString(),
          preparationTime: prepDate.toISOString(),
          expiry_deadline: expDate.toISOString(),
          expiryDeadline: expDate.toISOString(),
          donor_address: pickupAddress,
          donorAddress: pickupAddress,
          donor_latitude: Number(latitude),
          donorLatitude: Number(latitude),
          donor_longitude: Number(longitude),
          donorLongitude: Number(longitude),
          notes,
          updated_at: nowIso,
          updatedAt: nowIso,
          status_history: [
            ...(donationToEdit.status_history || donationToEdit.statusHistory || []),
            {
              status: donationToEdit.status,
              timestamp: nowIso,
              updatedBy: user.id,
              updatedByName: profile?.display_name || profile?.organization_name || 'Donor',
              notes: 'Donation listing details updated by donor',
            },
          ],
        });
      } else {
        // Create new donation
        createDonation(
          user.id,
          profile?.organization_name || profile?.display_name || 'Verified Donor',
          profile?.phone || '',
          pickupAddress,
          Number(latitude),
          Number(longitude),
          foodName,
          category,
          Number(quantity),
          unit,
          Number(estimatedServings),
          dietaryInfo,
          packagingCondition,
          storageInstructions,
          prepDate.toISOString(),
          expDate.toISOString(),
          notes
        );
      }

      onClose();
    } catch (err: unknown) {
      console.error('Error saving donation:', err);
      setError('Failed to save donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {donationToEdit ? 'Edit Surplus Food Listing' : 'Post Surplus Food Donation'}
            </h2>
            <p className="text-xs text-gray-500">
              Your listing is broadcasted in real time to nearby verified NGOs
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Food item title & category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Food Name / Item Description *
              </label>
              <input
                type="text"
                required
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Paneer Butter Masala & Steamed Jeera Rice"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="cooked_meals">Cooked Meals / Buffet</option>
                <option value="fresh_produce">Fresh Fruits & Vegetables</option>
                <option value="packaged_goods">Packaged / Dry Goods</option>
                <option value="bakery">Bakery & Breads</option>
                <option value="dairy">Dairy & Desserts</option>
                <option value="beverages">Beverages & Juices</option>
              </select>
            </div>
          </div>

          {/* Quantity, Unit & Servings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="meals">Meals</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="portions">Portions</option>
                <option value="boxes">Boxes / Trays</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Estimated Servings *
              </label>
              <input
                type="number"
                min={1}
                required
                value={estimatedServings}
                onChange={(e) => setEstimatedServings(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Dietary Information Tags */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Dietary Specification
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['veg', 'non_veg', 'vegan', 'halal', 'jain'] as DietaryType[]).map((type) => {
                const active = dietaryInfo.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleDietary(type)}
                    className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preparation & Expiry Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div>
              <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Preparation / Harvest Time *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-rose-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Expiry Deadline (Must be in future) *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={expiryDeadline}
                onChange={(e) => setExpiryDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium text-rose-900"
              />
            </div>
          </div>

          {/* Packaging and Storage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Packaging Condition *
              </label>
              <input
                type="text"
                required
                value={packagingCondition}
                onChange={(e) => setPackagingCondition(e.target.value)}
                placeholder="e.g. Stainless steel sealed degchis, tamper-proof boxes"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Storage Instructions
              </label>
              <input
                type="text"
                value={storageInstructions}
                onChange={(e) => setStorageInstructions(e.target.value)}
                placeholder="e.g. Keep hot at > 60°C or refrigerate immediately"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Pickup Address & Coordinates */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-semibold text-gray-700">
                Pickup Address *
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={locating}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <Compass className="w-3 h-3" />
                <span>{locating ? 'Detecting GPS...' : 'Auto-detect Location'}</span>
              </button>
            </div>
            <div className="relative mb-2">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Complete street address, building floor, pickup bay"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select
                  onChange={(e) => {
                    const preset = CITY_PRESETS.find((c) => c.name === e.target.value);
                    if (preset) {
                      setLatitude(preset.lat);
                      setLongitude(preset.lng);
                      if (!pickupAddress) setPickupAddress(preset.name);
                    }
                  }}
                  className="w-full py-1.5 px-2.5 text-[11px] border border-gray-200 rounded-lg text-gray-600 bg-gray-50"
                >
                  <option value="">Or match City Coordinates...</option>
                  {CITY_PRESETS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                Lat: {latitude.toFixed(3)}, Lng: {longitude.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Special Pickup Notes */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Special Handling / Gate Access Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please bring insulated transport bags; ask for Kitchen Manager Ramesh at rear service door."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {submitting ? (
                <span>Writing to Firestore...</span>
              ) : donationToEdit ? (
                <span>Save Changes</span>
              ) : (
                <span>Publish Surplus Food Listing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
