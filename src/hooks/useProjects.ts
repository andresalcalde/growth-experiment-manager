import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';

export function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = async () => {
    try {
      console.log('🔄 Fetching projects...');
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Projects response:', { data, error });

      if (error) throw error;
      setProjects(data || []);
      setError(null);
      console.log(`✅ Loaded ${data?.length || 0} projects`);
    } catch (err: any) {
      console.error('❌ Error fetching projects:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (project: any) => {
    try {
      console.log('➕ Creating project:', project);
      const { data, error } = await supabase
        .rpc('create_project_with_membership', {
          p_name: project.name, p_nsm_name: project.nsm_name,
          p_nsm_value: project.nsm_value, p_nsm_target: project.nsm_target,
          p_nsm_unit: project.nsm_unit, p_nsm_type: project.nsm_type,
          p_logo: project.logo, p_industry: project.industry,
        });

      console.log('📦 Create response:', { data, error });
      if (error) throw error;
      await fetchProjects();
      const { data: created, error: readError } = await supabase.from('projects').select('*').eq('id', data).single();
      if (readError) throw readError;
      return created;
    } catch (err: any) {
      console.error('❌ Create error:', err);
      handleSupabaseError(err, 'Create Project');
      throw err;
    }
  };

  const updateProject = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (err: any) {
      handleSupabaseError(err, 'Update Project');
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (err: any) {
      handleSupabaseError(err, 'Delete Project');
      throw err;
    }
  };

  useEffect(() => {
    console.log('🔌 useProjects initialized');
    fetchProjects();

    const subscription = supabase
      .channel('projects_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => { fetchProjects(); }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects
  };
}
