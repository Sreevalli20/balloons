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
import { createDonation } from '../../services/supabaseData';
import {
  Utensils,
  Clock,
  MapPin,
  Compass,
  AlertTriangle,
  Calendar,
  Check,
  Package,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface CreateDonationFormProps {
  onSuccess?: (newDonation: FoodDonation) => void;
  onCancel?: () => void;
  isInline?: boolean;
}

export const CreateDonationForm: React.FC<CreateDonationFormProps> = ({
  onSuccess,
  onCancel,
  isInline = false,
}) => {
  const { user, profile } = useAuth();

  const formatDatetimeLocal = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const defaultPrep = formatDatetimeLocal(new Date(Date.now() - 60 * 60 * 1000));
  const defaultExp = formatDatetimeLocal(new Date(Date.now() + 5 * 60 * 60 * 1000));

  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('cooked_meals');
  const [quantity, setQuantity] = useState<number>(40);
  const [unit, setUnit] = useState<QuantityUnit>('meals');
  const [estimatedServings, setEstimatedServings] = useState<number>(40);
  const [dietaryInfo, setDietaryInfo] = useState<DietaryType[]>(['veg']);
  const [packagingCondition, setPackagingCondition] = useState('Hot-sealed food-grade insulated containers');
  const [storageInstructions, setStorageInstructions] = useState('Keep warm above 60°C or consume within 4 hours');
  const [preparationTime, setPreparationTime] = useState(defaultPrep);
  const [expiryDeadline, setExpiryDeadline] = useState(defaultExp);
  const [pickupAddress, setPickupAddress] = useState(profile?.address || '');
  const [latitude, setLatitude] = useState<number>(profile?.latitude || 12.9352);
  const [longitude, setLongitude] = useState<number>(profile?.longitude || 77.6245);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync profile defaults
  useEffect(() => {
    if (profile) {
      if (!pickupAddress && profile.address) setPickupAddress(profile.address);
      if (profile.latitude) setLatitude(profile.latitude);
      if (profile.longitude) setLongitude(profile.longitude);
    }
  }, [profile]);

  const handleQuantityChange = (val: number) => {
    setQuantity(val);
    if (unit === 'meals' || unit === 'portions') {
      setEstimatedServings(val);
    } else if (unit === 'kg') {
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

  const handleQuickPrepTime = (hoursAgo: number) => {
    const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    setPreparationTime(formatDatetimeLocal(d));
  };

  const handleQuickExpiryTime = (hoursAhead: number) => {
    const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    setExpiryDeadline(formatDatetimeLocal(d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in as a donor to post surplus food.');
      return;
    }

    if (!foodName.trim()) {
      setError('Food name and description are required.');
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
      setError('Expiry deadline must be in the future.');
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

    if (!pickupAddress.trim()) {
      setError('Please enter a pickup address for NGO drivers.');
      return;
    }

    setSubmitting(true);
    const nowIso = now.toISOString();

    try {
      const newDonation = createDonation(
        user.id,
        profile?.organizationName || profile?.displayName || 'Verified Donor',
        profile?.phone || '',
        pickupAddress.trim(),
        Number(latitude),
        Number(longitude),
        foodName.trim(),
        category,
        Number(quantity),
        unit,
        Number(estimatedServings),
        dietaryInfo,
        packagingCondition,
        storageInstructions,
        prepDate.toISOString(),
        expDate.toISOString(),
        notes.trim()
      );

      if (onSuccess) {
        onSuccess(newDonation);
      }
    } catch (err: unknown) {
      console.error('Error creating donation:', err);
      setError('Failed to create donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl ${isInline ? 'border border-gray-200 p-6 shadow-sm' : ''}`}>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-11 h-11 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center shadow-inner">
          <Utensils className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Create Food Surplus Listing
          </h2>
          <p className="text-xs text-gray-500">
            Broadcasting in real-time to verified relief NGOs with matching capacity & proximity
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
        {/* Food Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Food Name & Description *
            </label>
            <input
              type="text"
              required
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. Vegetable Biryani with Cucumber Raita"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="cooked_meals">Cooked Meals / Buffet</option>
              <option value="fresh_produce">Fresh Fruits & Veggies</option>
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
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

        {/* Dietary Information */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1.5">
            Dietary Specification & Tags
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

        {/* Preparation & Expiry Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Preparation / Harvest Time *</span>
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickPrepTime(0)}
                  className="text-emerald-700 hover:underline"
                >
                  Now
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => handleQuickPrepTime(1)}
                  className="text-emerald-700 hover:underline"
                >
                  1h ago
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-rose-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Expiry Deadline (Must be in future) *</span>
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickExpiryTime(3)}
                  className="text-rose-700 hover:underline"
                >
                  +3h
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => handleQuickExpiryTime(6)}
                  className="text-rose-700 hover:underline"
                >
                  +6h
                </button>
              </div>
            </div>
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
              placeholder="e.g. Keep hot at > 60°C or consume within 4 hours"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Pickup Address & Geolocation Integration */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block font-semibold text-gray-700">
              Pickup Address & Geocoding *
            </label>
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={locating}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <Compass className="w-3 h-3" />
              <span>{locating ? 'Detecting GPS...' : 'Auto-detect GPS Location'}</span>
            </button>
          </div>
          <div className="relative mb-2">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Complete street address, kitchen entrance, pickup bay"
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
                <option value="">Select City GPS Reference Area...</option>
                {CITY_PRESETS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              GPS: [{latitude.toFixed(4)}, {longitude.toFixed(4)}]
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">
            Gate Access & Driver Pickup Instructions
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Enter through kitchen service entrance; ask for Chef Ramesh at dispatch desk."
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {submitting ? (
              <span>Saving to database...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Publish Surplus Food Listing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
