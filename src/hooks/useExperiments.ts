import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';

export function useExperiments(projectId: string | null) {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExperiments = async () => {
    if (!projectId) {
      console.log('⚠️ useExperiments: No projectId');
      setExperiments([]);
      setLoading(false);
      return;
    }

    try {
      console.log(`🔄 Fetching experiments for project: ${projectId}`);
      setLoading(true);
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('project_id', projectId)
        .order('ice_score', { ascending: false });

      console.log('📦 Supabase response:', { data, error });

      if (error) throw error;
      setExperiments(data || []);
      setError(null);
      console.log(`✅ Loaded ${data?.length || 0} experiments`);
    } catch (err: any) {
      console.error('❌ Error fetching experiments:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createExperiment = async (experiment: any) => {
    try {
      console.log('➕ Creating experiment:', experiment);
      const { data, error } = await supabase
        .from('experiments')
        .insert([experiment])
        .select()
        .single();

      console.log('📦 Create response:', { data, error });
      if (error) throw error;
      await fetchExperiments();
      return data;
    } catch (err: any) {
      console.error('❌ Create error:', err);
      handleSupabaseError(err, 'Create Experiment');
      throw err;
    }
  };

  const updateExperiment = async (id: string, updates: any) => {
    try {
      console.log(`🔄 Updating experiment ${id}:`, updates);
      const { data, error } = await supabase
        .from('experiments')
        .update(updates)
        .eq('id', id)
        .select();

      console.log('📦 Update response:', { data, error });
      if (error) throw error;
      await fetchExperiments();
    } catch (err: any) {
      console.error('❌ Update error:', err);
      handleSupabaseError(err, 'Update Experiment');
      throw err;
    }
  };

  const deleteExperiment = async (id: string) => {
    try {
      console.log(`🗑️ Deleting experiment ${id}`);
      const { error } = await supabase
        .from('experiments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchExperiments();
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      handleSupabaseError(err, 'Delete Experiment');
      throw err;
    }
  };

  useEffect(() => {
    console.log(`🔌 useExperiments initialized for project: ${projectId}`);
    fetchExperiments();

    if (!projectId) return;

    const subscription = supabase
      .channel(`experiments_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'experiments',
          filter: `project_id=eq.${projectId}`
        },
        () => fetchExperiments()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  return {
    experiments,
    loading,
    error,
    createExperiment,
    updateExperiment,
    deleteExperiment,
    refetch: fetchExperiments
  };
}
