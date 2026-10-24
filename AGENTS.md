# AnnaSetu AI - Project Information for Agents

## Project Overview

AnnaSetu AI is a food-rescue web application that connects food donors (restaurants, caterers, etc.) with NGOs to redistribute surplus food before it expires. The application is built with React, TypeScript, Vite, and uses Supabase for authentication, database, and real-time features.

## Technology Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **State Management:** React Context API
- **Icons:** Lucide React
- **Testing:** Vitest + jsdom

## Build Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Run tests
npm run test
npm run test:run

# Type checking
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

**IMPORTANT:** Never expose service-role keys or database passwords in client code.

## Database Schema

### Users Table
- Columns: `id`, `uid`, `email`, `display_name`, `role`, `organization_name`, `phone`, `address`, `latitude`, `longitude`, `is_verified`, `ngo_reg_number`, `ngo_capacity_meals`, `ngo_dietary_types`, `donor_type`, `created_at`, `updated_at`
- Roles: 'donor', 'ngo', 'admin'
- NGO-specific fields: registration number, capacity, dietary types
- Donor-specific fields: donor type (restaurant, caterer, etc.)

### Donations Table
- Columns: `id`, `donor_id`, `donor_name`, `donor_phone`, `donor_address`, `donor_latitude`, `donor_longitude`, `food_name`, `category`, `quantity`, `unit`, `estimated_servings`, `dietary_info`, `packaging_condition`, `storage_instructions`, `preparation_time`, `expiry_deadline`, `status`, `notes`, `assigned_ngo_id`, `assigned_ngo_name`, `assigned_ngo_phone`, `accepted_at`, `collected_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`, `actual_beneficiaries_served`, `status_history`, `created_at`, `updated_at`
- Status values: 'available', 'accepted', 'in_progress', 'collected', 'delivered', 'completed', 'cancelled', 'expired'
- Status history stored as JSONB array

### Database Functions
- `accept_donation(donation_id, ngo_uid, ngo_name, ngo_phone)` - Atomic function to prevent race conditions when accepting donations
- `expire_old_donations()` - Automatically marks expired donations (can be set up as cron job)

## Security Model

### Row Level Security (RLS) Policies

**Users Table:**
- Users can view their own profile
- Admins can view all profiles
- Users can insert their own profile during registration
- Users can update their own profile (but not role or is_verified)
- Admins can update any profile

**Donations Table:**
- Public can view available donations
- Donors can view their own donations
- NGOs can view donations assigned to them
- Admins can view all donations
- Donors can create donations
- Donors can update their own available/cancelled donations (if not assigned)
- Verified NGOs can accept donations (transition to accepted)
- NGOs can update assigned donations (in_progress, collected, delivered)
- Admins can update any donation
- Donors can cancel their own available donations

**Key Security Points:**
- Users cannot modify their own role or verification status
- Only admins can verify NGOs
- The `accept_donation` function prevents race conditions
- Expired donations cannot be accepted

## Component Structure

### Main Components
- `App.tsx` - Main application with routing
- `Navbar.tsx` - Navigation bar
- `ConnectionBanner.tsx` - Shows Supabase connection status
- `AuthModal.tsx` - Authentication modal (login/register)

### Context
- `AuthContext.tsx` - Authentication state and user profile management

### Dashboard Components
- `DonorDashboard.tsx` - Donor portal for managing donations
- `NgoDashboard.tsx` - NGO portal for browsing and accepting donations
- `ImpactDashboard.tsx` - Impact analytics dashboard
- `AdminPanel.tsx` - Admin panel for NGO verification

### Form Components
- `DonorRegistrationForm.tsx` - Donor registration form
- `NgoRegistrationForm.tsx` - NGO registration form
- `CreateDonationForm.tsx` - Inline donation creation form
- `DonationFormModal.tsx` - Modal for creating/editing donations
- `DonationDetailModal.tsx` - Modal for viewing donation details

### Utilities
- `supabase.ts` - Supabase client configuration and error handling
- `types.ts` - TypeScript type definitions
- `utils/expiry.ts` - Expiry calculation utilities
- `utils/geo.ts` - Geolocation and distance calculations
- `utils/matching.ts` - Smart matching engine

## Admin Configuration

The application recognizes `kksreevalli2801@gmail.com` as the admin email. This is configured in `src/context/AuthContext.tsx` (line 27). To change this, update the `ADMIN_EMAIL` constant.

## Real-time Features

The application uses Supabase Realtime for:
- Live updates to donor's own donations
- Live updates to available donations for NGOs
- Live updates to NGO's assigned pickups
- Live updates to all donations for admin panel

To enable Realtime in Supabase:
1. Go to Database > Replication
2. Enable Realtime for `donations` and `users` tables

## Database Migrations

Migrations are located in `supabase/migrations/`:
- `001_initial_schema.sql` - Creates tables, indexes, triggers, and functions
- `002_rls_policies.sql` - Sets up Row Level Security policies

Apply migrations via Supabase Dashboard SQL Editor or Supabase CLI.

## Key Implementation Details

### Snake_case vs camelCase
- Database columns use snake_case (Supabase/PostgreSQL convention)
- TypeScript types support both snake_case and camelCase for compatibility
- Components use snake_case when accessing database fields directly
- Components use camelCase for frontend-only properties

### Authentication Flow
1. User registers via AuthModal
2. Supabase Auth creates auth user
3. Application creates user profile in `users` table
4. Admin email automatically gets admin role
5. NGOs start with `is_verified = false`
6. Admin must verify NGOs before they can accept donations

### Donation Lifecycle
1. Donor creates donation (status: available)
2. NGO accepts donation via `accept_donation` function (status: accepted)
3. NGO marks as in progress (status: in_progress)
4. NGO marks as collected (status: collected)
5. NGO confirms delivery with beneficiaries served (status: delivered)
6. System can mark as completed (status: completed)
7. Donor can cancel if not assigned (status: cancelled)
8. System auto-expires past deadline (status: expired)

### Matching Algorithm
The matching engine calculates scores (0-100) based on:
- Distance (up to 35 points) - closer is better
- Urgency (up to 25 points) - sooner expiry is better
- Capacity (up to 25 points) - batch size vs NGO capacity
- Dietary compatibility (up to 15 points) - dietary preferences alignment

Scores are transparent with detailed reasons.

## Data Integrity Rules

- No fake data, no demo seeding
- Genuine empty states when database is empty
- All metrics calculated from real database records
- Impact dashboard shows "No Completed Deliveries" when database is empty
- Never simulate or fabricate statistics

## Common Issues

### Connection Errors
- Verify `.env.local` variables are correct
- Check Supabase project is active
- Ensure URL and key are from project settings

### RLS Policy Violations
- Check that policies are applied in Supabase
- Verify user is authenticated
- Check that user has appropriate role

### Real-time Not Working
- Enable Realtime in Supabase Dashboard
- Check table replication settings
- Verify internet connection

### NGO Cannot Accept Donations
- Ensure NGO is verified (`is_verified = true`)
- Check donation is not expired
- Verify donation status is 'available'
- Check NGO role is correct in database

## Testing

Run tests with `npm run test:run`. Tests cover:
- Matching engine logic
- Expiry calculations
- Distance calculations
- Status transitions
- Dietary compatibility