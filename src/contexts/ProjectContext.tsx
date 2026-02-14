import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Project, NorthStarMetric, Objective, Strategy, Experiment } from '../types'

// ============================================================================
// Types
// ============================================================================

/**
 * Maps Supabase DB row to frontend Project shape.
 * The frontend Project type has a nested structure; we flatten from DB rows.
 */

interface ProjectContextValue {
    // Project list (for portfolio)
    projects: Project[]
    projectsLoading: boolean

    // Active project
    activeProjectId: string | null
    activeProject: Project | null
    setActiveProjectId: (id: string) => void

    // Derived data from active project
    northStar: NorthStarMetric
    objectives: Objective[]
    strategies: Strategy[]
    experiments: Experiment[]

    // Mutations – NorthStar
    updateNorthStar: (ns: NorthStarMetric) => void

    // Mutations – Objectives
    addObjective: (title: string, description?: string) => void
    editObjective: (id: string, title: string, description?: string) => void
    deleteObjective: (id: string) => void

    // Mutations – Strategies
    addStrategy: (objectiveId: string, title: string, targetMetric?: string) => void
    editStrategy: (id: string, title: string) => void
    deleteStrategy: (id: string) => void

    // Mutations – Experiments
    addExperiment: (exp: Omit<Experiment, 'id'> & { id?: string }) => void
    updateExperiment: (id: string, updates: Partial<Experiment>) => void
    deleteExperiment: (id: string) => void
    setExperiments: (updater: Experiment[] | ((prev: Experiment[]) => Experiment[])) => void

    // Project CRUD
    createProject: (project: Project) => Promise<void>
    deleteProject: (id: string) => Promise<void>

    // Refresh
    refetchAll: () => Promise<void>
}

const DEFAULT_NORTH_STAR: NorthStarMetric = {
    name: 'Revenue',
    currentValue: 0,
    targetValue: 0,
    unit: '$',
    type: 'currency',
}

// ============================================================================
// Context
// ============================================================================

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function useProjectContext(): ProjectContextValue {
    const ctx = useContext(ProjectContext)
    if (!ctx) throw new Error('useProjectContext must be used within a ProjectProvider')
    return ctx
}

// ============================================================================
// Helper: Map DB rows → frontend types
// ============================================================================

function dbRowToProject(row: any): Omit<Project, 'objectives' | 'strategies' | 'experiments'> & {
    metadata: Project['metadata']
    northStar: NorthStarMetric
    objectives: Objective[]
    strategies: Strategy[]
    experiments: Experiment[]
} {
    return {
        metadata: {
            id: row.id,
            name: row.name,
            logo: row.logo || undefined,
            createdAt: row.created_at,
            industry: row.industry || undefined,
        },
        northStar: {
            name: row.nsm_name || 'Revenue',
            currentValue: Number(row.nsm_value) || 0,
            targetValue: Number(row.nsm_target) || 0,
            unit: row.nsm_unit || '$',
            type: row.nsm_type || 'currency',
        },
        objectives: [],
        strategies: [],
        experiments: [],
    }
}

function dbRowToObjective(row: any): Objective {
    return {
        id: row.id,
        title: row.title,
        status: row.status === 'Active' ? 'Active' : 'Done',
        progress: row.progress || 0,
        description: row.description || undefined,
    }
}

function dbRowToStrategy(row: any): Strategy {
    return {
        id: row.id,
        title: row.title,
        parentObjectiveId: row.objective_id,
        targetMetric: row.target_metric || undefined,
    }
}

function dbRowToExperiment(row: any): Experiment {
    return {
        id: row.id,
        title: row.title,
        status: row.status,
        owner: {
            name: row.owner_name || '',
            avatar: row.owner_avatar || '',
        },
        hypothesis: row.hypothesis || '',
        observation: row.observation || undefined,
        problem: row.problem || undefined,
        source: row.source || undefined,
        labels: row.labels || undefined,
        impact: row.impact || 5,
        confidence: row.confidence || 5,
        ease: row.ease || 5,
        iceScore: row.ice_score || 125,
        funnelStage: row.funnel_stage || 'Acquisition',
        northStarMetric: row.north_star_metric || '',
        linkedStrategyId: row.linked_strategy_id || undefined,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        testUrl: row.test_url || undefined,
        successCriteria: row.success_criteria || undefined,
        targetMetric: row.target_metric || undefined,
        keyLearnings: row.key_learnings || undefined,
        visualProof: row.visual_proof || undefined,
    }
}

// ============================================================================
// Provider
// ============================================================================

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const { user, isSuperAdmin, loading: authLoading } = useAuth()

    const [projects, setProjects] = useState<Project[]>([])
    const [projectsLoading, setProjectsLoading] = useState(true)

    // Active project ID – persisted in localStorage
    const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
        try {
            return localStorage.getItem('lastActiveProjectId') || null
        } catch {
            return null
        }
    })

    const setActiveProjectId = useCallback((id: string) => {
        setActiveProjectIdState(id)
        try {
            localStorage.setItem('lastActiveProjectId', id)
        } catch (e) {
            console.warn('Failed to persist activeProjectId:', e)
        }
    }, [])

    // ── Fetch all projects with their child data ──────────────────────────────

    const fetchProjects = useCallback(async () => {
        if (!user) {
            setProjects([])
            setProjectsLoading(false)
            return
        }

        try {
            setProjectsLoading(true)

            // Step 1: Fetch project list (RLS handles superadmin vs normal)
            const { data: projectRows, error: projError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false })

            if (projError) throw projError
            if (!projectRows || projectRows.length === 0) {
                setProjects([])
                setProjectsLoading(false)
                return
            }

            const projectIds = projectRows.map(p => p.id)

            // Step 2: Fetch all child data in parallel
            const [objRes, stratRes, expRes] = await Promise.all([
                supabase.from('objectives').select('*').in('project_id', projectIds),
                supabase.from('strategies').select('*').in('project_id', projectIds),
                supabase.from('experiments').select('*').in('project_id', projectIds).order('ice_score', { ascending: false }),
            ])

            // Step 3: Group by project
            const objByProject = groupBy(objRes.data || [], 'project_id')
            const stratByProject = groupBy(stratRes.data || [], 'project_id')
            const expByProject = groupBy(expRes.data || [], 'project_id')

            const fullProjects: Project[] = projectRows.map(row => {
                const base = dbRowToProject(row)
                return {
                    ...base,
                    objectives: (objByProject[row.id] || []).map(dbRowToObjective),
                    strategies: (stratByProject[row.id] || []).map(dbRowToStrategy),
                    experiments: (expByProject[row.id] || []).map(dbRowToExperiment),
                }
            })

            setProjects(fullProjects)

            // Auto-select first project if none currently selected
            setActiveProjectIdState(prev => {
                if (!prev && fullProjects.length > 0) {
                    const firstId = fullProjects[0].metadata.id
                    try { localStorage.setItem('lastActiveProjectId', firstId) } catch { }
                    return firstId
                }
                return prev
            })

        } catch (err) {
            console.error('❌ Error fetching projects:', err)
        } finally {
            setProjectsLoading(false)
        }
    }, [user, isSuperAdmin])

    // Fetch when auth is ready
    useEffect(() => {
        if (!authLoading && user) {
            fetchProjects()
        } else if (!authLoading && !user) {
            setProjects([])
            setProjectsLoading(false)
        }
    }, [authLoading, user, fetchProjects])

    // ── Derived state ─────────────────────────────────────────────────────────

    const activeProject = projects.find(p => p.metadata.id === activeProjectId) || projects[0] || null
    const northStar = activeProject?.northStar || DEFAULT_NORTH_STAR
    const objectives = activeProject?.objectives || []
    const strategies = activeProject?.strategies || []
    const experiments = activeProject?.experiments || []

    // ── Mutations ─────────────────────────────────────────────────────────────

    // North Star
    const updateNorthStar = useCallback(async (ns: NorthStarMetric) => {
        if (!activeProjectId) return

        // Optimistic update
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId ? { ...p, northStar: ns } : p
        ))

        const { error } = await supabase
            .from('projects')
            .update({
                nsm_name: ns.name,
                nsm_value: ns.currentValue,
                nsm_target: ns.targetValue,
                nsm_unit: ns.unit,
                nsm_type: ns.type,
            })
            .eq('id', activeProjectId)

        if (error) {
            console.error('Error updating north star:', error)
            fetchProjects() // Rollback
        }
    }, [activeProjectId, fetchProjects])

    // Objectives
    const addObjective = useCallback(async (title: string, description?: string) => {
        if (!activeProjectId) return

        const { data, error } = await supabase
            .from('objectives')
            .insert({ project_id: activeProjectId, title, description: description || null, status: 'Active', progress: 0 })
            .select()
            .single()

        if (error) {
            console.error('Error adding objective:', error)
            return
        }

        // Update local state
        const newObj = dbRowToObjective(data)
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, objectives: [...p.objectives, newObj] }
                : p
        ))
    }, [activeProjectId])

    const editObjective = useCallback(async (id: string, title: string, description?: string) => {
        const updates: any = { title }
        if (description !== undefined) updates.description = description

        // Optimistic
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, objectives: p.objectives.map(o => o.id === id ? { ...o, title, ...(description !== undefined && { description }) } : o) }
                : p
        ))

        const { error } = await supabase.from('objectives').update(updates).eq('id', id)
        if (error) {
            console.error('Error editing objective:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    const deleteObjective = useCallback(async (id: string) => {
        // Cascade happens at DB level, but we need to clean local state
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? {
                    ...p,
                    objectives: p.objectives.filter(o => o.id !== id),
                    strategies: p.strategies.filter(s => s.parentObjectiveId !== id),
                    experiments: p.experiments.map(e =>
                        p.strategies.some(s => s.parentObjectiveId === id && s.id === e.linkedStrategyId)
                            ? { ...e, linkedStrategyId: undefined }
                            : e
                    ),
                }
                : p
        ))

        const { error } = await supabase.from('objectives').delete().eq('id', id)
        if (error) {
            console.error('Error deleting objective:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    // Strategies
    const addStrategy = useCallback(async (objectiveId: string, title: string, targetMetric?: string) => {
        if (!activeProjectId) return

        const { data, error } = await supabase
            .from('strategies')
            .insert({
                project_id: activeProjectId,
                objective_id: objectiveId,
                title,
                target_metric: targetMetric || null,
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding strategy:', error)
            return
        }

        const newStrat = dbRowToStrategy(data)
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, strategies: [...p.strategies, newStrat] }
                : p
        ))
    }, [activeProjectId])

    const editStrategy = useCallback(async (id: string, title: string) => {
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, strategies: p.strategies.map(s => s.id === id ? { ...s, title } : s) }
                : p
        ))

        const { error } = await supabase.from('strategies').update({ title }).eq('id', id)
        if (error) {
            console.error('Error editing strategy:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    const deleteStrategy = useCallback(async (id: string) => {
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? {
                    ...p,
                    strategies: p.strategies.filter(s => s.id !== id),
                    experiments: p.experiments.map(e =>
                        e.linkedStrategyId === id ? { ...e, linkedStrategyId: undefined } : e
                    ),
                }
                : p
        ))

        const { error } = await supabase.from('strategies').delete().eq('id', id)
        if (error) {
            console.error('Error deleting strategy:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    // Experiments
    const addExperiment = useCallback(async (exp: Omit<Experiment, 'id'> & { id?: string }) => {
        if (!activeProjectId) return

        const { data, error } = await supabase
            .from('experiments')
            .insert({
                project_id: activeProjectId,
                title: exp.title,
                status: exp.status,
                owner_name: exp.owner.name,
                owner_avatar: exp.owner.avatar,
                hypothesis: exp.hypothesis,
                observation: exp.observation || null,
                problem: exp.problem || null,
                source: exp.source || null,
                labels: exp.labels || null,
                impact: exp.impact,
                confidence: exp.confidence,
                ease: exp.ease,
                ice_score: exp.iceScore,
                funnel_stage: exp.funnelStage,
                north_star_metric: exp.northStarMetric,
                linked_strategy_id: exp.linkedStrategyId || null,
                start_date: exp.startDate || null,
                end_date: exp.endDate || null,
                test_url: exp.testUrl || null,
                success_criteria: exp.successCriteria || null,
                target_metric: exp.targetMetric || null,
                key_learnings: exp.keyLearnings || null,
                visual_proof: exp.visualProof || null,
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding experiment:', error)
            return
        }

        const newExp = dbRowToExperiment(data)
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, experiments: [...p.experiments, newExp] }
                : p
        ))
    }, [activeProjectId])

    const updateExperiment = useCallback(async (id: string, updates: Partial<Experiment>) => {
        // Optimistic update
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, experiments: p.experiments.map(e => e.id === id ? { ...e, ...updates } : e) }
                : p
        ))

        // Map frontend keys to DB keys
        const dbUpdates: any = {}
        if (updates.title !== undefined) dbUpdates.title = updates.title
        if (updates.status !== undefined) dbUpdates.status = updates.status
        if (updates.owner !== undefined) {
            dbUpdates.owner_name = updates.owner.name
            dbUpdates.owner_avatar = updates.owner.avatar
        }
        if (updates.hypothesis !== undefined) dbUpdates.hypothesis = updates.hypothesis
        if (updates.observation !== undefined) dbUpdates.observation = updates.observation
        if (updates.problem !== undefined) dbUpdates.problem = updates.problem
        if (updates.source !== undefined) dbUpdates.source = updates.source
        if (updates.labels !== undefined) dbUpdates.labels = updates.labels
        if (updates.impact !== undefined) dbUpdates.impact = updates.impact
        if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence
        if (updates.ease !== undefined) dbUpdates.ease = updates.ease
        if (updates.iceScore !== undefined) dbUpdates.ice_score = updates.iceScore
        if (updates.funnelStage !== undefined) dbUpdates.funnel_stage = updates.funnelStage
        if (updates.northStarMetric !== undefined) dbUpdates.north_star_metric = updates.northStarMetric
        if (updates.linkedStrategyId !== undefined) dbUpdates.linked_strategy_id = updates.linkedStrategyId || null
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
        if (updates.testUrl !== undefined) dbUpdates.test_url = updates.testUrl
        if (updates.successCriteria !== undefined) dbUpdates.success_criteria = updates.successCriteria
        if (updates.targetMetric !== undefined) dbUpdates.target_metric = updates.targetMetric
        if (updates.keyLearnings !== undefined) dbUpdates.key_learnings = updates.keyLearnings
        if (updates.visualProof !== undefined) dbUpdates.visual_proof = updates.visualProof

        if (Object.keys(dbUpdates).length === 0) return

        const { error } = await supabase.from('experiments').update(dbUpdates).eq('id', id)
        if (error) {
            console.error('Error updating experiment:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    const deleteExperiment = useCallback(async (id: string) => {
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? { ...p, experiments: p.experiments.filter(e => e.id !== id) }
                : p
        ))

        const { error } = await supabase.from('experiments').delete().eq('id', id)
        if (error) {
            console.error('Error deleting experiment:', error)
            fetchProjects()
        }
    }, [activeProjectId, fetchProjects])

    // setExperiments – for drag-and-drop reordering and batch updates
    const setExperimentsLocal = useCallback((updater: Experiment[] | ((prev: Experiment[]) => Experiment[])) => {
        setProjects(prev => prev.map(p =>
            p.metadata.id === activeProjectId
                ? {
                    ...p,
                    experiments: typeof updater === 'function' ? updater(p.experiments) : updater,
                }
                : p
        ))
    }, [activeProjectId])

    // Project CRUD
    const createProject = useCallback(async (project: Project) => {
        const { data, error } = await supabase.rpc('create_project_with_membership', {
            p_name: project.metadata.name,
            p_nsm_name: project.northStar.name,
            p_nsm_value: project.northStar.currentValue,
            p_nsm_target: project.northStar.targetValue,
            p_nsm_unit: project.northStar.unit,
            p_nsm_type: project.northStar.type,
            p_logo: project.metadata.logo || null,
            p_industry: project.metadata.industry || null,
        })

        if (error) {
            console.error('Error creating project:', error)
            throw error
        }

        // Refetch to get the full project with correct ID
        await fetchProjects()

        // Set the new project as active
        if (data) {
            setActiveProjectId(data as string)
        }
    }, [fetchProjects, setActiveProjectId])

    const deleteProject = useCallback(async (id: string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id)
        if (error) {
            console.error('Error deleting project:', error)
            throw error
        }
        await fetchProjects()
    }, [fetchProjects])

    // ── Value ─────────────────────────────────────────────────────────────────

    const value: ProjectContextValue = {
        projects,
        projectsLoading,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        northStar,
        objectives,
        strategies,
        experiments,
        updateNorthStar,
        addObjective,
        editObjective,
        deleteObjective,
        addStrategy,
        editStrategy,
        deleteStrategy,
        addExperiment,
        updateExperiment,
        deleteExperiment,
        setExperiments: setExperimentsLocal,
        createProject,
        deleteProject,
        refetchAll: fetchProjects,
    }

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

// ── Utility ───────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, any>>(items: T[], key: string): Record<string, T[]> {
    return items.reduce((acc, item) => {
        const k = item[key]
        if (!acc[k]) acc[k] = []
        acc[k].push(item)
        return acc
    }, {} as Record<string, T[]>)
}
