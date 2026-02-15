export type Status =
  | 'Idea'
  | 'Prioritized'
  | 'Building'
  | 'Live Testing'
  | 'Analysis'
  | 'Finished - Winner'
  | 'Finished - Loser'
  | 'Finished - Inconclusive';

export type FunnelStage = 'Acquisition' | 'Activation' | 'Retention' | 'Referral' | 'Revenue';



export type MetricType = 'currency' | 'count' | 'percentage' | 'ratio';

export interface NorthStarMetric {
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  type: MetricType;  // 'currency', 'numeric', or 'percentage'
}

export interface Objective {
  id: string;
  title: string;
  status: 'Active' | 'Done';
  progress: number;
  description?: string; // Technical description of the growth lever
}

export interface Strategy {
  id: string;
  title: string;
  parentObjectiveId: string;
  targetMetric?: string; // Input metric this initiative targets (e.g., "CVR", "CAC", "Velocity")
}

export interface Experiment {
  id: string;
  title: string;
  status: Status;
  owner: { name: string; avatar: string };
  hypothesis: string;
  impact: number;
  confidence: number;
  ease: number;
  iceScore: number;
  funnelStage: FunnelStage;
  northStarMetric: string;
  linkedStrategyId?: string;
  startDate?: string;
  endDate?: string;
  testUrl?: string;
  keyLearnings?: string;
  visualProof?: string[];
  observation?: string;
  problem?: string;
  source?: string;
  labels?: string[];
  successCriteria?: string;
  targetMetric?: string;
}

export const _runtime_types_marker = true;

// Multi-Project Architecture Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Admin' | 'Lead' | 'Viewer';
  projectIds: string[];  // Projects this user has access to
}

export interface ProjectMetadata {
  id: string;
  name: string;
  logo?: string;
  createdAt: string;
  industry?: string;
}

export interface Project {
  metadata: ProjectMetadata;
  northStar: NorthStarMetric;
  objectives: Objective[];
  strategies: Strategy[];
  experiments: Experiment[];
}
