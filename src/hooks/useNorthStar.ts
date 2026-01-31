import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';

export function useNorthStar(projectId: string | null) {
  const [northStar, setNorthStar] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNorthStar = async () => {
    if (!projectId) {
      setNorthStar(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('north_star_metrics')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      setNorthStar(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching North Star:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateNorthStar = async (updates: any) => {
    if (!northStar?.id) return;

    try {
      const { error } = await supabase
        .from('north_star_metrics')
        .update(updates)
        .eq('id', northStar.id);

      if (error) throw error;
      await fetchNorthStar();
    } catch (err: any) {
      handleSupabaseError(err, 'Update North Star');
      throw err;
    }
  };

  useEffect(() => {
    fetchNorthStar();

    if (!projectId) return;

    const subscription = supabase
      .channel(`north_star_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'north_star_metrics',
          filter: `project_id=eq.${projectId}`
        },
        () => fetchNorthStar()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  return {
    northStar,
    loading,
    error,
    updateNorthStar,
    refetch: fetchNorthStar
  };
}
