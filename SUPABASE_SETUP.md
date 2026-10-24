# Supabase Setup Instructions

## Prerequisites

1. You should have a Supabase project created at https://supabase.com
2. Your `.env.local` file should contain:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
3. Enable Email authentication in your Supabase project

## Applying Database Migrations

### Option 1: Using Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (from the left sidebar)
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to execute
6. Create another new query
7. Copy and paste the contents of `supabase/migrations/002_rls_policies.sql`
8. Click **Run** to execute

### Option 2: Using Supabase CLI (for production workflows)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Database Schema Overview

### Users Table
- Stores user profiles with roles (donor, ngo, admin)
- Contains NGO-specific fields (registration number, capacity, dietary types)
- Contains donor-specific fields (donor type)
- Has RLS policies to prevent users from modifying their own role or verification status

### Donations Table
- Stores food donation listings
- Tracks donation lifecycle through status field
- Contains NGO assignment details
- Stores complete status history as JSONB
- Has RLS policies for:
  - Public read access to available donations
  - Donors can only modify their own available donations
  - Verified NGOs can accept donations via the `accept_donation` function
  - Admins have full access

### Database Functions
- `accept_donation(donation_id, ngo_uid, ngo_name, ngo_phone)` - Atomic function to prevent race conditions when accepting donations
- `expire_old_donations()` - Automatically marks expired donations (can be set up as a cron job)

## Verifying the Setup

After applying migrations, verify in the Supabase Dashboard:

1. **Table Editor** - Check that `users` and `donations` tables exist with correct columns
2. **Authentication** - Ensure Email/Password authentication is enabled
3. **Policies** - Check that RLS policies are active on both tables
4. **Functions** - Verify that `accept_donation` function exists in the database

## Setting Up Authentication

1. In Supabase Dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email templates if needed
4. Set up email confirmation (optional but recommended)
5. Note: Google OAuth can be enabled later if required

## Admin Email Configuration

The application is configured to recognize `kksreevalli2801@gmail.com` as the admin email. To change this:

1. Update the `ADMIN_EMAIL` constant in `src/context/AuthContext.tsx` (line 27)
2. Create an admin user in the `users` table with `role = 'admin'` and `is_verified = true`

## Important Security Notes

- The RLS policies enforce security at the database level
- Users cannot modify their own `role` or `is_verified` fields
- Only admins can verify NGOs
- The `accept_donation` function prevents race conditions when multiple NGOs try to accept the same donation
- Expired donations are automatically handled by the `expire_old_donations` function (can be set up as a scheduled job via Supabase cron or Edge Functions)
- Never expose the `service_role` key in client-side code
- Only use the anon/public key for client-side operations

## Testing the Setup

After migrations are applied:

1. Run the development server: `npm run dev`
2. Try registering a new donor account
3. Try registering a new NGO account
4. Test donation creation and acceptance workflow
5. Verify that all data persists in Supabase
6. Check the ConnectionBanner component to verify Supabase connectivity

## Remaining Setup Tasks

After applying migrations:

1. **Enable Realtime** (for live updates):
   - Go to Database > Replication
   - Enable Realtime for `donations` and `users` tables
   - This enables live updates when donations are created/accepted

2. **Set up expired donation cleanup** (optional):
   - Use Supabase Edge Functions or pg_cron to call `expire_old_donations()` periodically
   - This automatically marks donations as expired after their deadline

3. **Configure the admin account**:
   - Register with the admin email (`kksreevalli2801@gmail.com`)
   - The application will automatically create an admin profile
   - Manually verify NGOs through the Admin Panel

## Troubleshooting

- If you see connection errors, verify your `.env.local` variables are correct
- If donations don't persist, check the Supabase logs for RLS policy violations
- If NGO verification doesn't work, ensure the admin email is correctly set
- If real-time updates don't work, verify Realtime is enabled in Supabase
