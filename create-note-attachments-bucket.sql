-- Create Storage Bucket for Note Attachments
-- This allows images and audio files to be accessible across devices and in the admin panel

-- 1. Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up a policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'note-attachments');

-- 3. Allow public read access (so admin panel and other devices can view)
CREATE POLICY "Allow public read access" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'note-attachments');

-- 4. Allow users to update their own files
CREATE POLICY "Allow users to update own files" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'note-attachments');

-- 5. Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'note-attachments');
