-- Add privacy and terms of use declaration columns to distributor_profiles
ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS declaration_privacy_accepted BOOLEAN DEFAULT false;
ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS declaration_terms_use_accepted BOOLEAN DEFAULT false;
