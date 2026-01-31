export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          logo: string | null
          industry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo?: string | null
          industry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo?: string | null
          industry?: string | null
          updated_at?: string
        }
      }
      north_star_metrics: {
        Row: {
          id: string
          project_id: string
          name: string
          current_value: number
          target_value: number
          unit: string
          type: 'currency' | 'numeric' | 'percentage'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          current_value: number
          target_value: number
          unit: string
          type: 'currency' | 'numeric' | 'percentage'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          current_value?: number
          target_value?: number
          unit?: string
          type?: 'currency' | 'numeric' | 'percentage'
          updated_at?: string
        }
      }
      objectives: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'Active' | 'Paused' | 'Completed'
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'Active' | 'Paused' | 'Completed'
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'Active' | 'Paused' | 'Completed'
          progress?: number
          updated_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          project_id: string
          objective_id: string
          title: string
          target_metric: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          objective_id: string
          title: string
          target_metric?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          target_metric?: string | null
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          name: string
          email: string
          avatar: string
          role: 'Admin' | 'Lead' | 'Viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          avatar: string
          role: 'Admin' | 'Lead' | 'Viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string
          avatar?: string
          role?: 'Admin' | 'Lead' | 'Viewer'
          updated_at?: string
        }
      }
      team_member_projects: {
        Row: {
          id: string
          team_member_id: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_member_id: string
          project_id: string
          created_at?: string
        }
        Update: {}
      }
      experiments: {
        Row: {
          id: string
          project_id: string
          title: string
          status: 'Idea' | 'Prioritized' | 'Building' | 'Live Testing' | 'Analysis' | 'Finished - Winner' | 'Finished - Loser' | 'Finished - Inconclusive'
          owner_id: string
          hypothesis: string
          observation: string | null
          problem: string | null
          impact: number
          confidence: number
          ease: number
          ice_score: number
          funnel_stage: 'Acquisition' | 'Activation' | 'Retention' | 'Referral' | 'Revenue'
          north_star_metric: string
          linked_strategy_id: string | null
          start_date: string | null
          end_date: string | null
          test_url: string | null
          success_criteria: string | null
          target_metric: string | null
          key_learnings: string | null
          visual_proof: Json | null
          source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          status?: 'Idea' | 'Prioritized' | 'Building' | 'Live Testing' | 'Analysis' | 'Finished - Winner' | 'Finished - Loser' | 'Finished - Inconclusive'
          owner_id: string
          hypothesis: string
          observation?: string | null
          problem?: string | null
          impact: number
          confidence: number
          ease: number
          ice_score: number
          funnel_stage: 'Acquisition' | 'Activation' | 'Retention' | 'Referral' | 'Revenue'
          north_star_metric: string
          linked_strategy_id?: string | null
          start_date?: string | null
          end_date?: string | null
          test_url?: string | null
          success_criteria?: string | null
          target_metric?: string | null
          key_learnings?: string | null
          visual_proof?: Json | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          status?: 'Idea' | 'Prioritized' | 'Building' | 'Live Testing' | 'Analysis' | 'Finished - Winner' | 'Finished - Loser' | 'Finished - Inconclusive'
          owner_id?: string
          hypothesis?: string
          observation?: string | null
          problem?: string | null
          impact?: number
          confidence?: number
          ease?: number
          ice_score?: number
          funnel_stage?: 'Acquisition' | 'Activation' | 'Retention' | 'Referral' | 'Revenue'
          north_star_metric?: string
          linked_strategy_id?: string | null
          start_date?: string | null
          end_date?: string | null
          test_url?: string | null
          success_criteria?: string | null
          target_metric?: string | null
          key_learnings?: string | null
          visual_proof?: Json | null
          source?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
