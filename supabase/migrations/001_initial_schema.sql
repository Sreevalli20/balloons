-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL, -- Firebase UID compatibility
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor', 'ngo', 'admin')),
  organization_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN DEFAULT FALSE,

  -- NGO-specific fields
  ngo_reg_number TEXT,
  ngo_capacity_meals INTEGER DEFAULT 100,
  ngo_dietary_types TEXT[] DEFAULT ARRAY['veg', 'non_veg']::TEXT[],

  -- Donor-specific fields
  donor_type TEXT CHECK (donor_type IN ('restaurant', 'caterer', 'grocery', 'bakery', 'corporate', 'individual')),

  -- Verification notes for NGOs
  verification_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  donor_phone TEXT NOT NULL,
  donor_address TEXT NOT NULL,
  donor_latitude DOUBLE PRECISION,
  donor_longitude DOUBLE PRECISION,

  -- Food details
  food_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cooked_meals', 'fresh_produce', 'packaged_goods', 'bakery', 'dairy', 'beverages')),
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('meals', 'kg', 'portions', 'boxes')),
  estimated_servings INTEGER NOT NULL,
  dietary_info TEXT[] DEFAULT ARRAY[]::TEXT[],
  packaging_condition TEXT NOT NULL,
  storage_instructions TEXT,

  -- Timing
  preparation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  expiry_deadline TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'in_progress', 'collected', 'delivered', 'completed', 'cancelled', 'expired')),
  notes TEXT,

  -- NGO assignment
  assigned_ngo_id TEXT REFERENCES users(uid) ON DELETE SET NULL,
  assigned_ngo_name TEXT,
  assigned_ngo_phone TEXT,

  -- Lifecycle timestamps
  accepted_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  actual_beneficiaries_served INTEGER,

  -- Status history (stored as JSONB)
  status_history JSONB DEFAULT '[]'::JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_assigned_ngo_id ON donations(assigned_ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_expiry_deadline ON donations(expiry_deadline);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations(category);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire donations
CREATE OR REPLACE FUNCTION expire_old_donations()
RETURNS void AS $$
BEGIN
  UPDATE donations
  SET status = 'expired',
      updated_at = NOW(),
      status_history = status_history || jsonb_build_object(
        'status', 'expired',
        'timestamp', NOW(),
        'updatedBy', 'system',
        'updatedByName', 'Automated Expiry',
        'notes', 'Donation automatically expired due to deadline'
      )
  WHERE status = 'available'
    AND expiry_deadline < NOW();
END;
$$ LANGUAGE plpgsql;
