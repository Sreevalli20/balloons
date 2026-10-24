-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES

-- Allow read access to own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = uid);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Allow insert (registration) - handled by application logic
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

-- Allow update own profile with restrictions
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = uid)
  WITH CHECK (
    auth.uid()::text = uid
    AND role = (SELECT role FROM users WHERE id = OLD.id) -- Cannot change own role
    AND is_verified = (SELECT is_verified FROM users WHERE id = OLD.id) -- Cannot verify self
  );

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  );

-- DONATIONS TABLE POLICIES

-- Public read access to available donations
CREATE POLICY "Public can view available donations"
  ON donations FOR SELECT
  USING (status = 'available');

-- Donors can view their own donations
CREATE POLICY "Donors can view own donations"
  ON donations FOR SELECT
  USING (auth.uid()::text = donor_id);

-- NGOs can view donations assigned to them
CREATE POLICY "NGOs can view assigned donations"
  ON donations FOR SELECT
  USING (auth.uid()::text = assigned_ngo_id);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON donations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Donors can create donations
CREATE POLICY "Donors can create donations"
  ON donations FOR INSERT
  WITH CHECK (auth.uid()::text = donor_id);

-- Donors can update their own donations with restrictions
CREATE POLICY "Donors can update own donations"
  ON donations FOR UPDATE
  USING (auth.uid()::text = donor_id)
  WITH CHECK (
    auth.uid()::text = donor_id
    AND status IN ('available', 'cancelled') -- Can only modify available or cancelled donations
    AND (assigned_ngo_id IS NULL OR assigned_ngo_id = '') -- Cannot modify if assigned
  );

-- NGOs can accept donations (transition to accepted)
CREATE POLICY "Verified NGOs can accept donations"
  ON donations FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT uid FROM users
      WHERE role = 'ngo' AND is_verified = true
    )
  )
  WITH CHECK (
    status = 'available'
    AND NEW.status = 'accepted'
    AND NEW.assigned_ngo_id = auth.uid()::text
    AND expiry_deadline > NOW()
  );

-- NGOs can update assigned donations (in_progress, collected, delivered)
CREATE POLICY "NGOs can update assigned donations"
  ON donations FOR UPDATE
  USING (auth.uid()::text = assigned_ngo_id)
  WITH CHECK (
    auth.uid()::text = assigned_ngo_id
    AND status IN ('accepted', 'in_progress', 'collected')
    AND NEW.status IN ('in_progress', 'collected', 'delivered')
  );

-- Admins can update any donation
CREATE POLICY "Admins can update any donation"
  ON donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Donors can cancel their own available donations
CREATE POLICY "Donors can cancel own donations"
  ON donations FOR UPDATE
  USING (auth.uid()::text = donor_id)
  WITH CHECK (
    auth.uid()::text = donor_id
    AND status = 'available'
    AND NEW.status = 'cancelled'
  );

-- Function to safely accept donation with atomic check
CREATE OR REPLACE FUNCTION accept_donation(
  donation_id UUID,
  ngo_uid TEXT,
  ngo_name TEXT,
  ngo_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_status TEXT;
  donation_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lock the row and get current state
  SELECT status, expiry_deadline INTO current_status, donation_expiry
  FROM donations
  WHERE id = donation_id
  FOR UPDATE;

  -- Check if donation is still available
  IF current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation not found');
  END IF;

  IF current_status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation is no longer available (status: ' || current_status || ')');
  END IF;

  -- Check if donation has expired
  IF donation_expiry < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation has expired');
  END IF;

  -- Update the donation atomically
  UPDATE donations
  SET
    status = 'accepted',
    assigned_ngo_id = ngo_uid,
    assigned_ngo_name = ngo_name,
    assigned_ngo_phone = ngo_phone,
    accepted_at = NOW(),
    updated_at = NOW(),
    status_history = status_history || jsonb_build_object(
      'status', 'accepted',
      'timestamp', NOW(),
      'updatedBy', ngo_uid,
      'updatedByName', ngo_name,
      'notes', 'Surplus food accepted by ' || ngo_name
    )
  WHERE id = donation_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION accept_donation TO authenticated;
