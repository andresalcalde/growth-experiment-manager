import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    content = f.read()

# 1. Replace Sidebar Block
old_sidebar = """        <button 
          className={'tab ' + (view === 'board' ? 'active' : '')} 
          onClick={() => setView('board')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'board' ? 'var(--accent-soft)' : 'transparent', color: view === 'board' ? 'var(--accent)' : 'inherit' }}
        >
          <LayoutDashboard size={18} />
          <span style={{ fontWeight: 500 }}>Board</span>
        </button>

        <button 
          className={'tab ' + (view === 'table' ? 'active' : '')} 
          onClick={() => setView('table')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--accent-soft)' : 'transparent', color: view === 'table' ? 'var(--accent)' : 'inherit' }}
        >
          <TableIcon size={18} />
          <span style={{ fontWeight: 500 }}>Backlog Table</span>
        </button>

         <button 
          className={'tab ' + (view === 'roadmap' ? 'active' : '')} 
          onClick={() => setView('roadmap')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'roadmap' ? 'var(--accent-soft)' : 'transparent', color: view === 'roadmap' ? 'var(--accent)' : 'inherit' }}
        >
          <GitBranch size={18} />
          <span style={{ fontWeight: 500 }}>Roadmap</span>
        </button>

        <button 
          className={'tab ' + (view === 'library' ? 'active' : '')} 
          onClick={() => setView('library')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'library' ? 'var(--accent-soft)' : 'transparent', color: view === 'library' ? 'var(--accent)' : 'inherit' }}
        >
          <Book size={18} />
          <span style={{ fontWeight: 500 }}>Library</span>
        </button>"""

new_sidebar = """        <button 
          className={'tab ' + (view === 'roadmap' ? 'active' : '')} 
          onClick={() => setView('roadmap')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'roadmap' ? 'var(--accent-soft)' : 'transparent', color: view === 'roadmap' ? 'var(--accent)' : 'inherit' }}
        >
          <GitBranch size={18} />
          <span style={{ fontWeight: 500 }}>01. Design</span>
        </button>

        <button 
          className={'tab ' + (view === 'table' ? 'active' : '')} 
          onClick={() => setView('table')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--accent-soft)' : 'transparent', color: view === 'table' ? 'var(--accent)' : 'inherit' }}
        >
          <TableIcon size={18} />
          <span style={{ fontWeight: 500 }}>02. Explore</span>
        </button>

        <button 
          className={'tab ' + (view === 'board' ? 'active' : '')} 
          onClick={() => setView('board')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'board' ? 'var(--accent-soft)' : 'transparent', color: view === 'board' ? 'var(--accent)' : 'inherit' }}
        >
          <LayoutDashboard size={18} />
          <span style={{ fontWeight: 500 }}>03. Be Agile</span>
        </button>

        <button 
          className={'tab ' + (view === 'library' ? 'active' : '')} 
          onClick={() => setView('library')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'library' ? 'var(--accent-soft)' : 'transparent', color: view === 'library' ? 'var(--accent)' : 'inherit' }}
        >
          <Book size={18} />
          <span style={{ fontWeight: 500 }}>04. Learning</span>
        </button>"""

if old_sidebar in content:
    content = content.replace(old_sidebar, new_sidebar)
    print("Replaced sidebar buttons")
else:
    print("Could not find sidebar buttons block")

# 2. Replace Header Titles
old_header = """           <h2 style={{ fontSize: '18px' }}>
              {view === 'board' && 'Experiment Board'}
              {view === 'table' && 'Idea Backlog'}
              {view === 'roadmap' && 'Strategic Roadmap'}
              {view === 'library' && 'Learning Library'}
           </h2>"""

new_header = """           <h2 style={{ fontSize: '18px' }}>
              {view === 'roadmap' && '01. Design'}
              {view === 'table' && '02. Explore'}
              {view === 'board' && '03. Be Agile'}
              {view === 'library' && '04. Learning'}
           </h2>"""

if old_header in content:
    content = content.replace(old_header, new_header)
    print("Replaced header titles")
else:
    print("Could not find header titles block")

with open(app_path, 'w') as f:
    f.write(content)
