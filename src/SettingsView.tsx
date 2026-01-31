import React, { useState } from 'react';
import { X, Plus, Mail, Trash2, Users, Shield, Edit2, Briefcase } from 'lucide-react';
import type { TeamMember, Project } from './types';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  projects: Project[];
  onAddMember: (member: TeamMember) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateMember: (memberId: string, updates: Partial<TeamMember>) => void;
}

const ROLE_COLORS = {
  Admin: '#7C3AED',
  Lead: '#3B82F6',
  Viewer: '#6B7280'
};

const AVATAR_OPTIONS = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '🧑‍🎓', '👨‍🎨', '👩‍🎤'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen,
  onClose,
  teamMembers,
  projects,
  onAddMember,
  onRemoveMember,
  onUpdateMember
}) => {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  // Add Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Lead' | 'Viewer'>('Lead');
  const [newMemberAvatar, setNewMemberAvatar] = useState('👤');
  const [newMemberProjectIds, setNewMemberProjectIds] = useState<string[]>([]);

  // Edit Member Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'Lead' | 'Viewer'>('Lead');
  const [editAvatar, setEditAvatar] = useState('👤');
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      avatar: newMemberAvatar,
      role: newMemberRole,
      projectIds: newMemberProjectIds
    };

    onAddMember(newMember);
    
    // Reset form
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Lead');
    setNewMemberAvatar('👤');
    setNewMemberProjectIds([]);
    setIsAddingMember(false);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditAvatar(member.avatar);
    setEditProjectIds(member.projectIds || []);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;

    onUpdateMember(editingMember.id, {
      name: editName,
      email: editEmail,
      role: editRole,
      avatar: editAvatar,
      projectIds: editProjectIds
    });

    setEditingMember(null);
  };

  const toggleProjectAccess = (projectId: string, isAdding: boolean) => {
    if (isAdding) {
      if (editingMember) {
        setEditProjectIds(prev => [...prev, projectId]);
      } else {
        setNewMemberProjectIds(prev => [...prev, projectId]);
      }
    } else {
      if (editingMember) {
        setEditProjectIds(prev => prev.filter(id => id !== projectId));
      } else {
        setNewMemberProjectIds(prev => prev.filter(id => id !== projectId));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color="#4F46E5" />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
                Team Management
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Manage team members, roles, and project access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '32px',
          flex: 1,
          overflowY: 'auto'
        }}>
          {/* Add Member Button */}
          {!isAddingMember && !editingMember && (
            <button
              onClick={() => setIsAddingMember(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                background: 'white',
                color: '#4F46E5',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.background = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.background = 'white';
              }}
            >
              <Plus size={18} />
              Invite Team Member
            </button>
          )}

          {/* Add/Edit Member Form */}
          {(isAddingMember || editingMember) && (
            <div style={{
              padding: '24px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editingMember ? editName : newMemberName}
                    onChange={(e) => editingMember ? setEditName(e.target.value) : setNewMemberName(e.target.value)}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editingMember ? editEmail : newMemberEmail}
                    onChange={(e) => editingMember ? setEditEmail(e.target.value) : setNewMemberEmail(e.target.value)}
                    placeholder="john@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Avatar
                  </label>
                  <select
                    value={editingMember ? editAvatar : newMemberAvatar}
                    onChange={(e) => editingMember ? setEditAvatar(e.target.value) : setNewMemberAvatar(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '24px',
                      outline: 'none',
                      cursor: 'pointer',
                      background: 'white',
                      textAlign: 'center'
                    }}
                  >
                    {AVATAR_OPTIONS.map(avatar => (
                      <option key={avatar} value={avatar}>{avatar}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Role
                  </label>
                  <select
                    value={editingMember ? editRole : newMemberRole}
                    onChange={(e) => editingMember ? setEditRole(e.target.value as any) : setNewMemberRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                      background: 'white'
                    }}
                  >
                    <option value="Viewer">Viewer - Can view experiments</option>
                    <option value="Lead">Lead - Can create and manage experiments</option>
                    <option value="Admin">Admin - Full access to all features</option>
                  </select>
                </div>
              </div>

              {/* Project Access */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  <Briefcase size={16} />
                  Project Access
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {projects.map(project => {
                    const isAssigned = editingMember 
                      ? editProjectIds.includes(project.metadata.id)
                      : newMemberProjectIds.includes(project.metadata.id);
                    
                    return (
                      <label
                        key={project.metadata.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: `2px solid ${isAssigned ? '#4F46E5' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          background: isAssigned ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => toggleProjectAccess(project.metadata.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{project.metadata.logo || '📁'}</span>
                        <span style={{ fontWeight: isAssigned ? 600 : 400 }}>
                          {project.metadata.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (editingMember) {
                      setEditingMember(null);
                    } else {
                      setIsAddingMember(false);
                      setNewMemberName('');
                      setNewMemberEmail('');
                      setNewMemberRole('Lead');
                      setNewMemberAvatar('👤');
                      setNewMemberProjectIds([]);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={editingMember ? handleSaveEdit : handleAddMember}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {editingMember ? 'Save Changes' : (
                    <>
                      <Plus size={16} />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Team Members Table */}
          {!isAddingMember && !editingMember && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                      Member
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                      Email
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                      Role
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                      Projects
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, index) => {
                    const memberProjects = projects.filter(p => member.projectIds?.includes(p.metadata.id));
                    
                    return (
                      <tr key={member.id} style={{
                        borderBottom: index < teamMembers.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px'
                            }}>
                              {member.avatar}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                                {member.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                            <Mail size={14} />
                            {member.email}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: `${ROLE_COLORS[member.role]}15`,
                            color: ROLE_COLORS[member.role],
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {member.role}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {memberProjects.length > 0 ? memberProjects.map(p => (
                              <div key={p.metadata.id} style={{
                                padding: '4px 8px',
                                background: '#f3f4f6',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#6b7280'
                              }}>
                                {p.metadata.logo || '📁'} {p.metadata.name}
                              </div>
                            )) : (
                              <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                                No projects assigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEditMember(member)}
                              style={{
                                padding: '8px',
                                border: 'none',
                                borderRadius: '6px',
                                background: 'transparent',
                                color: '#4F46E5',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Remove ${member.name} from the team?`)) {
                                  onRemoveMember(member.id);
                                }
                              }}
                              style={{
                                padding: '8px',
                                border: 'none',
                                borderRadius: '6px',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {teamMembers.length === 0 && !isAddingMember && !editingMember && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px' }}>No team members yet. Add your first member to get started!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f9fafb'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: '#4F46E5',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
