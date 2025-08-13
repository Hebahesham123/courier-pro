-- Create Requests Table for Shopify Form
-- Run this SQL in your Supabase SQL Editor

-- Create the requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    comment TEXT NOT NULL,
    order_id TEXT,  -- For storing Shopify order IDs
    image_url TEXT, -- For storing uploaded image URLs
    video_url TEXT, -- For storing uploaded video URLs
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'process', 'approved', 'cancelled')),
    assignee VARCHAR(100), -- For assigning requests to team members
    created_by VARCHAR(100) NOT NULL DEFAULT 'user:shopify-form',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_email ON requests(email);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee);

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON requests;
DROP POLICY IF EXISTS "Allow authenticated users to read requests" ON requests;
DROP POLICY IF EXISTS "Allow admins to update requests" ON requests;
DROP POLICY IF EXISTS "Allow admins to delete requests" ON requests;

-- Create policies for RLS
-- Allow all authenticated users to insert requests
CREATE POLICY "Allow authenticated users to insert requests" ON requests
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow all authenticated users to read requests
CREATE POLICY "Allow authenticated users to read requests" ON requests
    FOR SELECT TO authenticated
    USING (true);

-- Allow admins to update requests
CREATE POLICY "Allow admins to update requests" ON requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow admins to delete requests
CREATE POLICY "Allow admins to delete requests" ON requests
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_requests_updated_at();

-- Verify the table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'requests' 
ORDER BY ordinal_position;

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'requests' 
ORDER BY policyname;
