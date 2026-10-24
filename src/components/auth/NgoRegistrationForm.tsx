import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DietaryType } from '../../types';
import { CITY_PRESETS, getCurrentBrowserLocation } from '../../utils/geo';
import {
  HeartHandshake,
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
  FileCheck2,
  Info,
} from 'lucide-react';

interface NgoRegistrationFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onSwitchToDonorRegister: () => void;
}

export const NgoRegistrationForm: React.FC<NgoRegistrationFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  onSwitchToDonorRegister,
}) => {
  const { signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9784);
  const [longitude, setLongitude] = useState<number>(77.6408);

  // NGO Verification Credentials
  const [ngoRegNumber, setNgoRegNumber] = useState('');
  const [taxExemptionId, setTaxExemptionId] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [ngoCapacityMeals, setNgoCapacityMeals] = useState<number>(250);
  const [ngoDietaryTypes, setNgoDietaryTypes] = useState<DietaryType[]>([
    'veg',
    'non_veg',
  ]);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDietary = (type: DietaryType) => {
    setNgoDietaryTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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

    if (!email.trim() || !password || !organizationName.trim()) {
      setError('Please provide all mandatory organization and authentication details.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!ngoRegNumber.trim()) {
      setError('Please enter your NGO Government Registration / Society / Trust Certificate number for verification.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, {
        displayName: displayName.trim() || organizationName.trim(),
        organizationName: organizationName.trim(),
        role: 'ngo',
        phone: phone.trim(),
        address: address.trim() || 'Regional NGO Relief Base',
        latitude,
        longitude,
        isVerified: false, // Initial state for all new NGOs is unverified
        ngoRegNumber: ngoRegNumber.trim(),
        ngoCapacityMeals,
        ngoDietaryTypes,
        verificationNotes: `Registered on ${new Date().toLocaleDateString()}. Pending administrator certificate audit. Darpan ID: ${darpanId || 'N/A'}, 12A/80G: ${taxExemptionId || 'N/A'}.`,
      });

      // Redirect user to NGO dashboard to see the initial unverified state and verification timeline
      onSuccess();
    } catch (err: unknown) {
      console.error('NGO registration error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered') || msg.includes('duplicate key')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('weak password')) {
        setError('Password should be at least 6 characters.');
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
        <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Relief NGO & Food Bank Registration
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Join the AnnaSetu relief network to claim hot meals and fresh produce for communities in need
        </p>
      </div>

      {/* Compliance / Unverified notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Initial Verification Protocol: </span>
          In compliance with food safety norms, new NGO accounts are initialized in an{' '}
          <span className="font-semibold underline">Unverified State</span>. Once your
          registration certificate is verified by platform administrators, your account is
          unlocked to claim and coordinate food pickups.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Organization Name & Representative */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Registered NGO / Trust Name *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Annapurna Hunger Relief Foundation"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Representative / Director Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sunita Rao"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Verification Credentials: Reg Number, Darpan, 12A */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <div className="font-bold text-gray-800 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            <span>Official NGO Verification Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Society / Trust Reg No. *
              </label>
              <input
                type="text"
                required
                value={ngoRegNumber}
                onChange={(e) => setNgoRegNumber(e.target.value)}
                placeholder="e.g. KA/NGO/2023/88921"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                12A / 80G Certificate No.
              </label>
              <input
                type="text"
                value={taxExemptionId}
                onChange={(e) => setTaxExemptionId(e.target.value)}
                placeholder="e.g. AACTA0000FE20214"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                NITI Aayog Darpan ID
              </label>
              <input
                type="text"
                value={darpanId}
                onChange={(e) => setDarpanId(e.target.value)}
                placeholder="e.g. KA/2020/025412"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>
        </div>

        {/* Operational Capacity & Dietary Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-gray-700">
                Daily Meal Handling Capacity:
              </label>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                {ngoCapacityMeals} meals/day
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={1500}
              step={25}
              value={ngoCapacityMeals}
              onChange={(e) => setNgoCapacityMeals(Number(e.target.value))}
              className="w-full accent-emerald-600 mt-2"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Small (20)</span>
              <span>Medium (500)</span>
              <span>Large Hub (1,500+)</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Accepted Food Categories
            </label>
            <div className="flex flex-wrap gap-1">
              {(['veg', 'non_veg', 'vegan', 'halal', 'jain'] as DietaryType[]).map((type) => {
                const active = ngoDietaryTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleDietary(type)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium flex items-center gap-1 transition-all ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contact Email & Passwords */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Official NGO Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@ngomission.org"
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

        {/* Phone & Base Address with GPS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Coordination Phone *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98840 77123"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-gray-700">
                HQ / Community Distribution Base *
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
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, street, community hall locality"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span>Registering NGO with Firebase...</span>
          ) : (
            <>
              <span>Submit NGO Registration for Administrator Review</span>
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
            Already registered? Sign In
          </button>
          <button
            type="button"
            onClick={onSwitchToDonorRegister}
            className="text-gray-600 hover:text-emerald-700 hover:underline"
          >
            Register as a Food Donor instead
          </button>
        </div>
      </form>
    </div>
  );
};
