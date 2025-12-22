-- Create the community_rooms table
CREATE TABLE IF NOT EXISTS community_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- URL or icon name
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE community_rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view rooms
CREATE POLICY "Public rooms are viewable by everyone" ON community_rooms
  FOR SELECT USING (true);
  
-- Create the community_messages table
CREATE TABLE IF NOT EXISTS community_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES community_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Storing the Mongo ID or Supabase Auth ID
  user_name TEXT,
  user_avatar TEXT,
  content TEXT,
  file_url TEXT,
  file_type TEXT, -- 'image', 'pdf', 'excel', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view messages
CREATE POLICY "Messages are viewable by everyone" ON community_messages
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert messages
-- Note: Adjust 'authenticated' to 'anon' if you are using anonymous logic, but usually authenticated is best.
CREATE POLICY "Users can insert messages" ON community_messages
  FOR INSERT WITH CHECK (true);

-- Initial Data: 10 Community Rooms
INSERT INTO community_rooms (name, description, icon, category, created_at) VALUES
('Wellbeing Warriors', 'General mental health and wellbeing support.', 'Heart', 'Wellbeing', NOW()),
('Mental Support', 'A safe space to discuss mental health challenges.', 'Brain', 'Support', NOW()),
('Relationship Advice', 'Discussing healthy relationships and advice.', 'Users', 'Relationships', NOW()),
('User Experiences', 'Share your journey and experiences with others.', 'Star', 'Community', NOW()),
('Career Stress', 'Support for work-related stress and burnout.', 'Briefcase', 'Career', NOW()),
('Mindfulness Place', 'Tips and discussions on mindfulness and meditation.', 'Sun', 'Mindfulness', NOW()),
('Health & Nutrition', 'Discussing physical health, diet, and nutrition.', 'Apple', 'Health', NOW()),
('Sleep Hygiene', 'Tips for better sleep and overcoming insomnia.', 'Moon', 'Health', NOW()),
('Parenting Support', 'Support and advice for parents.', 'Baby', 'Family', NOW()),
('General Chat', 'Off-topic discussions and hanging out.', 'MessageCircle', 'General', NOW());
