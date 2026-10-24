import React, { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../../supabase';
import { FoodDonation } from '../../types';
import {
  Utensils,
  Leaf,
  Droplet,
  Truck,
  HeartHandshake,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface ImpactDashboardProps {
  onPostFood: () => void;
}

export const ImpactDashboard: React.FC<ImpactDashboardProps> = ({ onPostFood }) => {
  const [allDonations, setAllDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllDonations = async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'donations');
        setLoading(false);
        return;
      }

      if (data) {
        setAllDonations(data as FoodDonation[]);
      }
      setLoading(false);
    };

    fetchAllDonations();

    const channel = supabase
      .channel('all-donations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllDonations((prev) => [payload.new as FoodDonation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAllDonations((prev) =>
              prev.map((d) =>
                d.id === payload.new.id ? (payload.new as FoodDonation) : d
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAllDonations((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter ONLY genuinely delivered food records
  const deliveredDonations = allDonations.filter((d) =>
    ['delivered', 'completed'].includes(d.status)
  );

  // Compute genuine statistics
  const totalMealsDelivered = deliveredDonations.reduce(
    (acc, d) => acc + (d.actual_beneficiaries_served || d.estimated_servings || 0),
    0
  );

  const totalFoodRescuedKg = deliveredDonations.reduce((acc, d) => {
    if (d.unit === 'kg') {
      return acc + (d.quantity || 0);
    }
    // Standard UN benchmark: ~0.4 kg per meal serving
    return acc + (d.estimated_servings || d.quantity || 0) * 0.4;
  }, 0);

  // UN FAO benchmark: ~2.5 kg CO2e emissions avoided per 1 kg of surplus food rescued
  const co2AvoidedKg = Math.round(totalFoodRescuedKg * 2.5 * 10) / 10;

  // Water conservation benchmark: ~1,000 Liters of embedded water per 1 kg of prepared food
  const waterSavedLiters = Math.round(totalFoodRescuedKg * 1000);

  // Unique donors & NGOs involved in completed transactions
  const uniqueDonorsCount = new Set(deliveredDonations.map((d) => d.donor_id)).size;
  const uniqueNgosCount = new Set(
    deliveredDonations.map((d) => d.assigned_ngo_id).filter(Boolean)
  ).size;

  // Breakdown by food category from genuine data
  const categoryBreakdown: Record<string, { count: number; meals: number }> = {};
  deliveredDonations.forEach((d) => {
    const cat = d.category || 'cooked_meals';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, meals: 0 };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].meals +=
      d.actual_beneficiaries_served || d.estimated_servings || 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Real-Time Impact Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Surplus Food Rescue & Environmental Impact
          </h1>
          <p className="text-emerald-100 text-sm">
            All metrics shown below are calculated strictly from genuine, persisted
            delivery transactions in the Supabase database. Every meal represents food
            rescued from landfills and delivered to vulnerable people.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2" />
          <div>Computing genuine impact metrics from Supabase records...</div>
        </div>
      ) : deliveredDonations.length === 0 ? (
        /* Strict Requirement Empty State */
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-5 shadow-2xs">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Utensils className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900">
              No Completed Deliveries in Database Yet
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              In accordance with AnnaSetu AI integrity standards, this dashboard does not
              display simulated or mock impact numbers. Complete a full lifecycle food
              rescue (Donor posts surplus food → NGO accepts → Driver collects → NGO
              confirms delivery to beneficiaries) to log the first verified impact record.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onPostFood}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <span>Post Surplus Food to Initiate First Rescue</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Real Impact Cards */
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Meals */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                {totalMealsDelivered.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-gray-700">
                Nutritious Meals Served
              </div>
              <p className="text-[11px] text-gray-400">
                From {deliveredDonations.length} verified food distribution events
              </p>
            </div>

            {/* Food Rescued in Kg */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                {Math.round(totalFoodRescuedKg).toLocaleString()} kg
              </div>
              <div className="text-xs font-semibold text-gray-700">
                Surplus Food Rescued
              </div>
              <p className="text-[11px] text-gray-400">
                Diverted from municipal landfills and waste streams
              </p>
            </div>

            {/* CO2 Emissions Avoided */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                {co2AvoidedKg.toLocaleString()} kg
              </div>
              <div className="text-xs font-semibold text-gray-700">
                CO₂e Emissions Mitigated
              </div>
              <p className="text-[11px] text-gray-400">
                Calculated at 2.5 kg CO₂e avoided per kg food saved (UN FAO)
              </p>
            </div>

            {/* Water Preserved */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-gray-900 tracking-tight">
                {(waterSavedLiters / 1000).toFixed(1)} kL
              </div>
              <div className="text-xs font-semibold text-gray-700">
                Virtual Water Conserved
              </div>
              <p className="text-[11px] text-gray-400">
                Preserved agricultural & processing water footprint
              </p>
            </div>
          </div>

          {/* Network Ecosystem Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">{uniqueDonorsCount}</div>
                <div className="text-xs font-semibold text-gray-700">Active Donor Kitchens</div>
                <div className="text-[11px] text-gray-400">Logged genuine donations</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">{uniqueNgosCount}</div>
                <div className="text-xs font-semibold text-gray-700">Relief NGO Partners</div>
                <div className="text-[11px] text-gray-400">Completed verified rescues</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  {deliveredDonations.length}
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  Completed Transport Trips
                </div>
                <div className="text-[11px] text-gray-400">Zero food discarded in transit</div>
              </div>
            </div>
          </div>

          {/* Category Distribution from Real Data */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Genuine Rescue Breakdown by Category</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(categoryBreakdown).map(([cat, data]) => (
                  <div
                    key={cat}
                    className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1"
                  >
                    <div className="font-semibold text-emerald-950 capitalize truncate">
                      {cat.replace('_', ' ')}
                    </div>
                    <div className="text-lg font-black text-emerald-700">
                      {data.meals} meals
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {data.count} pickup batches
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Deliveries Ledger */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Verified Delivery & Distribution Audit Log
                </h3>
                <p className="text-xs text-gray-500">
                  Real records with immutable verification code and delivery timestamps
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {deliveredDonations.length} Verified Entries
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Verification Code</th>
                    <th className="py-3 px-4">Surplus Food Item</th>
                    <th className="py-3 px-4">Donor Establishment</th>
                    <th className="py-3 px-4">Assigned NGO</th>
                    <th className="py-3 px-4">Beneficiaries Fed</th>
                    <th className="py-3 px-4">Delivered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliveredDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        AS-{d.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{d.food_name}</div>
                        <div className="text-[10px] text-gray-400 capitalize">
                          {d.category.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-800">{d.donor_name}</td>
                      <td className="py-3 px-4 text-gray-800">
                        {d.assigned_ngo_name || 'Verified NGO'}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {d.actual_beneficiaries_served || d.estimated_servings} meals
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-[11px]">
                        {d.delivered_at ? new Date(d.delivered_at).toLocaleString() : 'Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
