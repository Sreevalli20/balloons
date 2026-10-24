# AnnaSetu AI — One Network. Less Waste. More Meals.

A complete, functional food-rescue web application for Team BRAIN CATALYST. Built with React, TypeScript, Vite, and Tailwind CSS, featuring real-time donation matching, role-based access control, and genuine impact analytics.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env.local and add your Supabase credentials
cp .env.example .env.local

# Run development server
npm run dev

# Run tests
npm run test:run

# Build for production
npm run build
```

## Features

- **Authentication & Roles:** Email/password authentication with donor, NGO, and administrator roles
- **Donor Portal:** Create, edit, view, and cancel food donations with rich metadata
- **NGO Portal:** Smart matching engine with explainable scores, pickup management, and delivery confirmation
- **Matching Engine:** Deterministic scoring based on distance, capacity, urgency, and dietary compatibility
- **Concurrency Protection:** Atomic Supabase RPC function prevents race conditions
- **Security:** Row Level Security (RLS) policies with role-based access control
- **Impact Analytics:** Genuine metrics calculated from real database records (no fake data)
- **Real-time Updates:** Supabase Realtime synchronizes dashboards instantly

## Complete Setup Guide

For detailed Supabase configuration, database migrations, and security policies, see [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Architecture

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **State Management:** React Context API
- **Icons:** Lucide React
- **Testing:** Vitest + jsdom

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

Run tests with `npm run test:run`.

## License

Part of Team BRAIN CATALYST for the AnnaSetu AI initiative.

## Support

For setup issues, refer to [SUPABASE_SETUP.md](SUPABASE_SETUP.md) or check the Supabase Dashboard for authentication and database configuration errors.

