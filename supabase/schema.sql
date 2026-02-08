-- Create clans table
CREATE TABLE clans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  github_username TEXT UNIQUE NOT NULL,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  clan_id UUID REFERENCES clans(id),
  role TEXT NOT NULL CHECK (role IN ('rookie', 'captain', 'organizer')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster auth_user_id lookups
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);

-- Create transactions table (stores rookies points)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  description TEXT,
  given_by_id UUID NOT NULL REFERENCES members(id), -- Captain or Organizer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read Clans" ON clans FOR SELECT USING (true);
CREATE POLICY "Public Read Members" ON members FOR SELECT USING (true);
CREATE POLICY "Public Read Transactions" ON transactions FOR SELECT USING (true);

-- Allow authenticated users to update their own profile (optional but good)
CREATE POLICY "Allow members to update own profile" ON members
  FOR UPDATE USING (auth.uid() = id);

-- Insert some initial clans
INSERT INTO clans (name) VALUES ('Alpha Bashers'), ('Beta Warriors'), ('Gamma Knights');
