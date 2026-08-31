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

export type NSMSourceType = 'manual' | 'google_sheets' | 'webhook';

export interface NSMSourceConfig {
  // Google Sheets specifics
  sheetName?: string;
  column?: string;       // e.g. "B"
  row?: number;          // e.g. 2
  headerRow?: number;    // first row to skip
}

export interface NorthStarMetric {
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  type: MetricType;  // 'currency', 'numeric', or 'percentage'
  // Auto-sync (added in migration_growth_hub_v2_nicolas.sql)
  sourceType?: NSMSourceType;
  sourceUrl?: string | null;
  sourceConfig?: NSMSourceConfig;
  lastSyncedAt?: string | null;
  syncStatus?: string | null;
  webhookToken?: string | null;
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
  verdict?: string;
  visualProof?: string[];
  observation?: string;
  problem?: string;
  source?: string;
  labels?: string[];
  successCriteria?: string;
  targetMetric?: string;
  campaignObjective?: string; // Objetivo de campaña: Ventas, Leads, Tráfico, etc.
  isPublic?: boolean; // Visible en la Biblioteca Global (público) vs solo dentro del proyecto (privado). Default: privado.
  createdBy?: string;   // profiles.id de quien creó (BD: created_by, default auth.uid())
  createdAt?: string;
  resolvedBy?: string;  // profiles.id de quien lo movió a Finished-*
  resolvedAt?: string;
}

// Objetivos de campaña disponibles para clasificar experimentos.
export const CAMPAIGN_OBJECTIVES = [
  'Ventas',
  'Leads',
  'Tráfico',
  'Awareness',
  'Conversión',
  'Engagement',
  'Otro',
] as const;

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
  logoUrl?: string;
  platformLogoUrl?: string;
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
