/*
  # Create User History Table for Dashboard

  1. New Tables
    - `user_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tool_id` (text, the tool used)
      - `query_text` (text, user's query)
      - `response_text` (text, AI response)
      - `document_id` (uuid, nullable, foreign key to documents)
      - `model_used` (text, AI model that generated response)
      - `query_complexity` (integer, complexity score)
      - `response_quality` (text, quality assessment)
      - `processing_time` (integer, response time in ms)
      - `metadata` (jsonb, additional interaction details)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on user_history table
    - Add policies for authenticated users to access their own history

  3. Indexes
    - Add indexes for efficient querying by user and date
    - Add index for tool-based filtering
*/

-- Create user_history table
CREATE TABLE IF NOT EXISTS user_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id text NOT NULL,
  query_text text NOT NULL,
  response_text text NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  model_used text NOT NULL DEFAULT 'unknown',
  query_complexity integer DEFAULT 0,
  response_quality text CHECK (response_quality IN ('low', 'standard', 'high')) DEFAULT 'standard',
  processing_time integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_history table
CREATE POLICY "Users can read own history"
  ON user_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON user_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON user_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_tool_id ON user_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_created ON user_history(user_id, created_at DESC);

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id uuid)
RETURNS TABLE (
  total_interactions integer,
  tools_used integer,
  documents_uploaded integer,
  avg_query_complexity float,
  most_used_tool text,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_interactions,
    COUNT(DISTINCT tool_id)::integer as tools_used,
    (SELECT COUNT(*)::integer FROM documents WHERE user_id = target_user_id) as documents_uploaded,
    AVG(query_complexity)::float as avg_query_complexity,
    (
      SELECT tool_id 
      FROM user_history 
      WHERE user_id = target_user_id 
      GROUP BY tool_id 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_used_tool,
    MAX(created_at) as last_activity
  FROM user_history
  WHERE user_id = target_user_id;
END;
$$;