# AnnaSetu AI — One Network. Less Waste. More Meals.

A complete, functional food-rescue web application for Team BRAIN CATALYST. Built with React, TypeScript, Vite, and Tailwind CSS, featuring real-time donation matching, role-based access control, and genuine impact analytics.

## Overview

AnnaSetu AI connects food donors (restaurants, caterers, etc.) with NGOs to redistribute surplus food before it expires. The platform ensures food reaches those in need while reducing waste.

## Features

- **Authentication & Roles:** Email/password authentication with donor, NGO, and administrator roles
- **Donor Portal:** Create, edit, view, and cancel food donations with rich metadata
- **NGO Portal:** Smart matching engine with explainable scores, pickup management, and delivery confirmation
- **Matching Engine:** Deterministic scoring based on distance, capacity, urgency, and dietary compatibility
- **Concurrency Protection:** Atomic Supabase RPC function prevents race conditions
- **Security:** Row Level Security (RLS) policies with role-based access control
- **Impact Analytics:** Genuine metrics calculated from real database records (no fake data)
- **Real-time Updates:** Supabase Realtime synchronizes dashboards instantly

## Technology Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **State Management:** React Context API
- **Icons:** Lucide React
- **Testing:** Vitest + jsdom

## Architecture

### Component Structure

**Main Components:**
- `App.tsx` - Main application with routing
- `Navbar.tsx` - Navigation bar
- `ConnectionBanner.tsx` - Shows Supabase connection status
- `AuthModal.tsx` - Authentication modal (login/register)

**Context:**
- `AuthContext.tsx` - Authentication state and user profile management

**Dashboard Components:**
- `DonorDashboard.tsx` - Donor portal for managing donations
- `NgoDashboard.tsx` - NGO portal for browsing and accepting donations
- `ImpactDashboard.tsx` - Impact analytics dashboard
- `AdminPanel.tsx` - Admin panel for NGO verification

**Form Components:**
- `DonorRegistrationForm.tsx` - Donor registration form
- `NgoRegistrationForm.tsx` - NGO registration form
- `CreateDonationForm.tsx` - Inline donation creation form
- `DonationFormModal.tsx` - Modal for creating/editing donations
- `DonationDetailModal.tsx` - Modal for viewing donation details

### Database Schema

**Users Table:**
- Columns: `id`, `uid`, `email`, `display_name`, `role`, `organization_name`, `phone`, `address`, `latitude`, `longitude`, `is_verified`, `ngo_reg_number`, `ngo_capacity_meals`, `ngo_dietary_types`, `donor_type`, `created_at`, `updated_at`
- Roles: 'donor', 'ngo', 'admin'
- NGO-specific fields: registration number, capacity, dietary types
- Donor-specific fields: donor type (restaurant, caterer, etc.)

**Donations Table:**
- Columns: `id`, `donor_id`, `donor_name`, `donor_phone`, `donor_address`, `donor_latitude`, `donor_longitude`, `food_name`, `category`, `quantity`, `unit`, `estimated_servings`, `dietary_info`, `packaging_condition`, `storage_instructions`, `preparation_time`, `expiry_deadline`, `status`, `notes`, `assigned_ngo_id`, `assigned_ngo_name`, `assigned_ngo_phone`, `accepted_at`, `collected_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`, `actual_beneficiaries_served`, `status_history`, `created_at`, `updated_at`
- Status values: 'available', 'accepted', 'in_progress', 'collected', 'delivered', 'completed', 'cancelled', 'expired'
- Status history stored as JSONB array

**Database Functions:**
- `accept_donation(donation_id, ngo_uid, ngo_name, ngo_phone)` - Atomic function to prevent race conditions when accepting donations
- `expire_old_donations()` - Automatically marks expired donations (can be set up as cron job)

### Security Model

**Row Level Security (RLS) Policies:**

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

## Data Integrity

This application strictly enforces data integrity:
- No fake users, donations, or impact statistics
- No demo data seeding
- No simulated authentication or database operations
- Genuine empty states when database is empty
- Real error messages for configuration issues
- All metrics calculated from actual Supabase records

## Security

- Supabase RLS policies enforce valid status transitions
- Role-based access control with ownership checks
- Immutable audit trail for all donations
- Users cannot modify their own roles or verification status
- Administrator-only NGO verification
- Atomic operations prevent duplicate acceptance
- Never exposes service-role keys in client code

## Testing

Automated tests cover:
- Matching engine eligibility and scoring
- Expiry calculations and edge cases
- Distance calculations (Haversine formula)
- Status transition validity
- Dietary compatibility checks

## License

Part of Team BRAIN CATALYST for the AnnaSetu AI initiative.
