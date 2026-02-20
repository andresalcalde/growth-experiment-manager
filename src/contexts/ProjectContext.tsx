import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, resilientSupabaseCall } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Project, NorthStarMetric, Objective, Strategy, Experiment, TeamMember } from '../types'

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

    // Team members of the active project
    teamMembers: TeamMember[]

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

    // Team Management
    addTeamMember: (email: string, role: TeamMember['role']) => Promise<void>
    updateTeamMemberRole: (userId: string, role: TeamMember['role']) => Promise<void>
    removeTeamMember: (userId: string) => Promise<void>

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
// Helpers: Role Mapping
// ============================================================================

const dbRoleToFrontend = (role: string): TeamMember['role'] => {
    switch (role) {
        case 'admin': return 'Admin'
        case 'editor': return 'Lead'
        case 'viewer': return 'Viewer'
        default: return 'Viewer'
    }
}

const frontendRoleToDb = (role: TeamMember['role']): string => {
    switch (role) {
        case 'Admin': return 'admin'
        case 'Lead': return 'editor'
        case 'Viewer': return 'viewer'
        default: return 'viewer'
    }
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
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

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
            const { data: projectRows, error: projError } = await resilientSupabaseCall(
                () => supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false }),
                3,
                'fetchProjects'
            )

            if (projError) throw projError
            if (!projectRows || projectRows.length === 0) {
                setProjects([])
                setProjectsLoading(false)
                return
            }

            const projectIds = projectRows.map(p => p.id)

            // Step 2: Fetch all child data in parallel
            const [objRes, stratRes, expRes] = await Promise.all([
                resilientSupabaseCall(() => supabase.from('objectives').select('*').in('project_id', projectIds), 3, 'fetchObjectives'),
                resilientSupabaseCall(() => supabase.from('strategies').select('*').in('project_id', projectIds), 3, 'fetchStrategies'),
                resilientSupabaseCall(() => supabase.from('experiments').select('*').in('project_id', projectIds).order('ice_score', { ascending: false }), 3, 'fetchExperiments'),
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

    // ── Fetch Team Members for Active Project ─────────────────────────────────

    const fetchTeamMembers = useCallback(async (projectId: string) => {
        try {
            // 1. Get member IDs and Roles
            const { data: members, error: memberError } = await supabase
                .from('project_members')
                .select('user_id, role')
                .eq('project_id', projectId)

            if (memberError) throw memberError

            if (!members || members.length === 0) {
                setTeamMembers([])
                return
            }

            const userIds = members.map(m => m.user_id)

            // 2. Get profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds)

            if (profileError) throw profileError

            // 3. Merge data
            const merged: TeamMember[] = profiles.map(p => {
                const memberInfo = members.find(m => m.user_id === p.id)
                const rawRole = memberInfo?.role || 'viewer'
                return {
                    id: p.id,
                    name: p.full_name || p.email || 'Unknown',
                    email: p.email || '',
                    avatar: p.avatar_url || '',
                    role: dbRoleToFrontend(rawRole),
                    projectIds: [projectId]
                }
            })

            setTeamMembers(merged)
        } catch (error) {
            console.error('Error fetching team members:', error)
            setTeamMembers([])
        }
    }, [])

    useEffect(() => {
        if (activeProjectId) {
            fetchTeamMembers(activeProjectId)
        } else {
            setTeamMembers([])
        }
    }, [activeProjectId, fetchTeamMembers])

    // ── Derived state ─────────────────────────────────────────────────────────

    const activeProject = projects.find(p => p.metadata.id === activeProjectId) || projects[0] || null
    const northStar = activeProject?.northStar || DEFAULT_NORTH_STAR
    const objectives = activeProject?.objectives || []
    const strategies = activeProject?.strategies || []
    const experiments = activeProject?.experiments || []

    // ── Mutations ─────────────────────────────────────────────────────────────

    // Team Management
    const addTeamMember = useCallback(async (email: string, role: TeamMember['role']) => {
        if (!activeProjectId) return

        // 1. Find user by email
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (profileError || !userProfile) {
            alert("Usuario no encontrado. Asegúrate de que se haya registrado en la plataforma.")
            return
        }

        // 2. Add to project_members
        const dbRole = frontendRoleToDb(role)
        const { error: insertError } = await supabase
            .from('project_members')
            .insert({
                project_id: activeProjectId,
                user_id: userProfile.id,
                role: dbRole
            })

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation
                alert("Este usuario ya es miembro del proyecto.")
            } else {
                console.error('Error adding team member:', insertError)
                alert("Error al agregar miembro.")
            }
            return
        }

        await fetchTeamMembers(activeProjectId)
    }, [activeProjectId, fetchTeamMembers])

    const updateTeamMemberRole = useCallback(async (userId: string, role: TeamMember['role']) => {
        if (!activeProjectId) return

        const dbRole = frontendRoleToDb(role)
        const { error } = await supabase
            .from('project_members')
            .update({ role: dbRole })
            .match({ project_id: activeProjectId, user_id: userId })

        if (error) {
            console.error('Error updating role:', error)
            alert("Error al actualizar rol.")
            return
        }

        await fetchTeamMembers(activeProjectId)
    }, [activeProjectId, fetchTeamMembers])

    const removeTeamMember = useCallback(async (userId: string) => {
        if (!activeProjectId) return

        const { error } = await supabase
            .from('project_members')
            .delete()
            .match({ project_id: activeProjectId, user_id: userId })

        if (error) {
            console.error('Error removing member:', error)
            alert("Error al eliminar miembro.")
            return
        }

        await fetchTeamMembers(activeProjectId)
    }, [activeProjectId, fetchTeamMembers])

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
                owner_id: user!.id,
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
    }, [activeProjectId, user])

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

    const createProject = useCallback(async (project: Project) => {
        console.log('🚀 [Turbo] Starting optimized createProject...')
        const startTime = Date.now()

        try {
            // 1. Create Project
            const { data: projectData, error: projectError } = await resilientSupabaseCall(
                () => supabase
                    .from('projects')
                    .insert({
                        name: project.metadata.name,
                        nsm_name: project.northStar.name,
                        nsm_value: project.northStar.currentValue,
                        nsm_target: project.northStar.targetValue,
                        nsm_unit: project.northStar.unit,
                        nsm_type: project.northStar.type,
                        logo: project.metadata.logo || null,
                        industry: project.metadata.industry || null,
                    })
                    .select('id')
                    .single(),
                3,
                'createProject:insert'
            )

            if (projectError) throw projectError
            if (!projectData) throw new Error('Project created but no data returned')
            const newProjectId = projectData.id as string

            // 2. Add Admin Member (Critical Step)
            const { error: memberError } = await resilientSupabaseCall(
                () => supabase.from('project_members').insert({
                    project_id: newProjectId,
                    user_id: user!.id,
                    role: 'admin',
                }),
                3,
                'createProject:addMember'
            )

            if (memberError) {
                console.error('❌ Error adding admin member, rolling back project...', memberError)
                await supabase.from('projects').delete().eq('id', newProjectId)
                throw memberError
            }

            // 3. Insert Objectives (if any)
            const objectivesToInsert = (project.objectives || []).map(obj => ({
                project_id: newProjectId,
                title: obj.title,
                description: obj.description || null,
                status: obj.status || 'Active',
                progress: obj.progress || 0,
            }))

            let newObjectives: any[] = []
            if (objectivesToInsert.length > 0) {
                const { data, error: objError } = await resilientSupabaseCall(
                    () => supabase.from('objectives').insert(objectivesToInsert).select('id'),
                    3,
                    'createProject:insertObjectives'
                )
                if (objError) throw objError
                newObjectives = data || []
            }

            // Map old ID -> new ID for Objectives
            const objectiveIdMap: Record<string, string> = {}
            if (project.objectives) {
                project.objectives.forEach((oldObj, index) => {
                    if (newObjectives[index]) {
                        objectiveIdMap[oldObj.id] = newObjectives[index].id
                    }
                })
            }

            // 4. Insert Strategies (Batch)
            let strategyIdMap: Record<string, string> = {}
            if (project.strategies && project.strategies.length > 0) {
                const strategiesToInsert = project.strategies
                    .filter(s => objectiveIdMap[s.parentObjectiveId]) // Only insert if parent exists
                    .map(s => ({
                        project_id: newProjectId,
                        objective_id: objectiveIdMap[s.parentObjectiveId],
                        title: s.title,
                        target_metric: s.targetMetric || null,
                    }))

                if (strategiesToInsert.length > 0) {
                    const { data: newStrategies, error: stratError } = await resilientSupabaseCall(
                        () => supabase
                            .from('strategies')
                            .insert(strategiesToInsert)
                            .select('id'),
                        3,
                        'createProject:insertStrategies'
                    )

                    if (stratError) throw stratError

                    // Map old ID -> new ID for Strategies
                    // We must filter the original list similarly to how we filtered the insert payload to maintain index alignment
                    const validStrategies = project.strategies.filter(s => objectiveIdMap[s.parentObjectiveId])
                    validStrategies.forEach((oldStrat, index) => {
                        if (newStrategies && newStrategies[index]) {
                            strategyIdMap[oldStrat.id] = newStrategies[index].id
                        }
                    })
                }
            }

            // 5. Insert Experiments (Batch)
            if (project.experiments && project.experiments.length > 0) {
                const experimentsToInsert = project.experiments.map(exp => ({
                    project_id: newProjectId,
                    owner_id: user!.id,
                    title: exp.title,
                    status: exp.status || 'Idea',
                    owner_name: exp.owner?.name || '',
                    owner_avatar: exp.owner?.avatar || '',
                    hypothesis: exp.hypothesis || '',
                    observation: exp.observation || null,
                    problem: exp.problem || null,
                    source: exp.source || null,
                    labels: exp.labels || null,
                    impact: exp.impact || 5,
                    confidence: exp.confidence || 5,
                    ease: exp.ease || 5,
                    ice_score: exp.iceScore || 125,
                    funnel_stage: exp.funnelStage || 'Acquisition',
                    north_star_metric: exp.northStarMetric || null,
                    // Link strategy only if we have a valid mapping
                    linked_strategy_id: exp.linkedStrategyId ? (strategyIdMap[exp.linkedStrategyId] || null) : null,
                    // Optional fields
                    start_date: exp.startDate || null,
                    end_date: exp.endDate || null,
                    test_url: exp.testUrl || null,
                    success_criteria: exp.successCriteria || null,
                    target_metric: exp.targetMetric || null,
                    key_learnings: exp.keyLearnings || null,
                    visual_proof: exp.visualProof || null,
                }))

                const { error: expError } = await resilientSupabaseCall(
                    () => supabase
                        .from('experiments')
                        .insert(experimentsToInsert),
                    3,
                    'createProject:insertExperiments'
                )

                if (expError) throw expError
            }

            // 6. Wrap up — Optimistic local state update (avoids AbortError from fetchProjects)
            console.log(`✅ Project created in ${Date.now() - startTime}ms`)

            // Build the new project object from what we know
            const newProject: Project = {
                metadata: {
                    id: newProjectId,
                    name: project.metadata.name,
                    logo: project.metadata.logo,
                    createdAt: new Date().toISOString(),
                    industry: project.metadata.industry,
                },
                northStar: {
                    name: project.northStar.name,
                    currentValue: project.northStar.currentValue,
                    targetValue: project.northStar.targetValue,
                    unit: project.northStar.unit,
                    type: project.northStar.type,
                },
                objectives: (project.objectives || []).map((obj, i) => ({
                    ...obj,
                    id: newObjectives[i]?.id || obj.id,
                })),
                strategies: (project.strategies || []).map(s => ({
                    ...s,
                    id: strategyIdMap[s.id] || s.id,
                    parentObjectiveId: objectiveIdMap[s.parentObjectiveId] || s.parentObjectiveId,
                })),
                experiments: project.experiments || [],
            }

            // Add to local state immediately (no network call needed)
            setProjects(prev => [newProject, ...prev])

            // Set the new project as active
            setActiveProjectId(newProjectId)

            // Fire a background sync to reconcile with DB (non-blocking)
            fetchProjects().catch(() => {
                console.warn('⚠️ Background sync after project creation failed (non-critical)')
            })
        } catch (err: any) {
            console.error('❌ createProject FAILED:', err)
            throw err
        }
    }, [fetchProjects, setActiveProjectId, user])

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
        teamMembers,
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
        addTeamMember,
        updateTeamMemberRole,
        removeTeamMember,
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
