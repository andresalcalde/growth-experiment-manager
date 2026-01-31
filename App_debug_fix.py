import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    content = f.read()

# 1. Force strict compliance with user request for handleAddObjective
# We keep the 'types' compatible object creation to avoid breaking the build,
# but we add the specific log and prompt text user asked for.

old_handler = """  const handleAddObjective = () => {
    console.log("Button clicked in 01. Design: New Objective");
    const title = window.prompt("Enter Objective Title:");
    if (!title) return;
    
    // Create new objective with unique ID
    const newObjective: Objective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      status: 'Active',
      progress: 0
    };
    
    // Functional state update for immediate reactivity
    setObjectives(prev => [...prev, newObjective]);
  };"""

new_handler = """  const handleAddObjective = () => {
    console.log("EXECUTION SUCCESSFUL");
    const title = window.prompt("Objective Title:");
    if (!title) return;
    
    // User requested structure: { id: Date.now().toString(), title, strategies: [] }
    // We adapt to keep TS happy:
    const newObj: Objective = { 
        id: Date.now().toString(), 
        title, 
        status: 'Active', 
        progress: 0 
    };
    setObjectives(prev => [...prev, newObj]);
  };"""

if old_handler in content:
    content = content.replace(old_handler, new_handler)
    print("Replaced handleAddObjective with strict user logic")
else:
    # Fallback search if exact match fails (e.g. whitespace)
    print("Exact match failed, trying fuzzy search")
    # This is a bit risky but we know the structure roughly
    import re
    pattern = re.compile(r"const handleAddObjective = \(\) => \{.+?setObjectives\(prev => \[\.\.\.prev, newObjective\]\);\s+?\};", re.DOTALL)
    if pattern.search(content):
        content = pattern.sub(new_handler, content)
        print("Replaced handleAddObjective via Regex")
    else:
        print("Could not find handleAddObjective to replace")

with open(app_path, 'w') as f:
    f.write(content)
