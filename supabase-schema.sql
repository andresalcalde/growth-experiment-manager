-- Growth Experiment Manager - Supabase Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- North Star Metrics Table
CREATE TABLE IF NOT EXISTS north_star_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('currency', 'numeric', 'percentage')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Objectives Table
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategies Table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_metric TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Lead', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Member Projects Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS team_member_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, project_id)
);

-- Experiments Table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Idea' CHECK (status IN (
    'Idea', 'Prioritized', 'Building', 'Live Testing', 'Analysis',
    'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
  )),
  owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  hypothesis TEXT NOT NULL,
  observation TEXT,
  problem TEXT,
  impact INTEGER NOT NULL CHECK (impact >= 0 AND impact <= 10),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 10),
  ease INTEGER NOT NULL CHECK (ease >= 0 AND ease <= 10),
  ice_score INTEGER NOT NULL,
  funnel_stage TEXT NOT NULL CHECK (funnel_stage IN ('Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue')),
  north_star_metric TEXT NOT NULL,
  linked_strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  test_url TEXT,
  success_criteria TEXT,
  target_metric TEXT,
  key_learnings TEXT,
  visual_proof JSONB,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_north_star_project ON north_star_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_objectives_project ON objectives(project_id);
CREATE INDEX IF NOT EXISTS idx_strategies_project ON strategies(project_id);
CREATE INDEX IF NOT EXISTS idx_strategies_objective ON strategies(objective_id);
CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_owner ON experiments(owner_id);
CREATE INDEX IF NOT EXISTS idx_experiments_strategy ON experiments(linked_strategy_id);
CREATE INDEX IF NOT EXISTS idx_team_member_projects_member ON team_member_projects(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_projects_project ON team_member_projects(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE north_star_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now - configure based on your auth setup)
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on north_star_metrics" ON north_star_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on objectives" ON objectives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on strategies" ON strategies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on team_member_projects" ON team_member_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on experiments" ON experiments FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_north_star_metrics_updated_at BEFORE UPDATE ON north_star_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
