import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DonorType } from '../../types';
import { CITY_PRESETS, getCurrentBrowserLocation } from '../../utils/geo';
import {
  Utensils,
  Mail,
  Lock,
  Building,
  User,
  Phone,
  MapPin,
  Compass,
  AlertCircle,
  ShieldCheck,
  Check,
  ArrowRight,
} from 'lucide-react';

interface DonorRegistrationFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onSwitchToNgoRegister: () => void;
}

export const DonorRegistrationForm: React.FC<DonorRegistrationFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  onSwitchToNgoRegister,
}) => {
  const { signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [donorType, setDonorType] = useState<DonorType>('restaurant');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9352);
  const [longitude, setLongitude] = useState<number>(77.6245);
  const [pledgeAgreed, setPledgeAgreed] = useState(true);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectGPS = async () => {
    setLocating(true);
    setError(null);
    try {
      const coords = await getCurrentBrowserLocation();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      if (!address) {
        setAddress(`GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to detect browser location.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim() || !password || !organizationName.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!pledgeAgreed) {
      setError('Please confirm the safe food quality and hygiene pledge to proceed.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, {
        displayName: displayName.trim() || organizationName.trim(),
        organizationName: organizationName.trim(),
        role: 'donor',
        donorType,
        phone: phone.trim(),
        address: address.trim() || 'Central Kitchen Locality',
        latitude,
        longitude,
      });

      // Redirect user to their respective donor dashboard
      onSuccess();
    } catch (err: unknown) {
      console.error('Donor registration error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered') || msg.includes('duplicate key')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('weak password')) {
        setError('Password should be stronger (at least 6 characters).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
          <Utensils className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Food Donor Registration
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Join AnnaSetu AI to turn kitchen & banquet surplus into meals for local shelters
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Establishment name & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Establishment / Kitchen Name *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Spice Route Bistro & Banquets"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Establishment Type *
            </label>
            <select
              value={donorType}
              onChange={(e) => setDonorType(e.target.value as DonorType)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="restaurant">Restaurant / Bistro</option>
              <option value="caterer">Event Caterer / Banquet Hall</option>
              <option value="grocery">Supermarket / Grocery Store</option>
              <option value="bakery">Bakery & Patisserie</option>
              <option value="corporate">Corporate Cafeteria / Canteen</option>
              <option value="individual">Community Host / Event Organizer</option>
            </select>
          </div>
        </div>

        {/* Contact Person & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Contact Person / Head Chef Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Chef Sanjay Verma"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Phone Number (for Pickup Coordination) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Email & Passwords */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Official Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kitchen@establishment.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Create Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Pickup Address & Geocoding */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-gray-700">
              Default Kitchen / Pickup Address *
            </label>
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={locating}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <Compass className="w-3 h-3" />
              <span>{locating ? 'Detecting GPS...' : 'Auto-detect GPS'}</span>
            </button>
          </div>
          <div className="relative mb-2">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street name, landmark, gate access"
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
                    if (!address) setAddress(preset.name);
                  }
                }}
                className="w-full py-1 px-2 text-[11px] border border-gray-200 rounded-lg text-gray-600 bg-gray-50"
              >
                <option value="">Or select City Preset coordinates...</option>
                {CITY_PRESETS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              [{latitude.toFixed(3)}, {longitude.toFixed(3)}]
            </div>
          </div>
        </div>

        {/* Safe Food Pledge */}
        <label className="flex items-start gap-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={pledgeAgreed}
            onChange={(e) => setPledgeAgreed(e.target.checked)}
            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
          />
          <div className="text-emerald-900 leading-tight">
            <span className="font-bold">Food Safety Pledge: </span>
            I pledge that surplus food offered is prepared in hygienic conditions, kept
            at safe holding temperatures, and safe for human consumption.
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Registering Account...</span>
          ) : (
            <>
              <span>Complete Donor Registration & Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-emerald-700 font-semibold hover:underline"
          >
            Already have an account? Sign In
          </button>
          <button
            type="button"
            onClick={onSwitchToNgoRegister}
            className="text-gray-600 hover:text-emerald-700 hover:underline"
          >
            Register as an NGO instead
          </button>
        </div>
      </form>
    </div>
  );
};
