import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    app_content = f.read()

# 1. Update RoadmapView render prop passing
# Find <RoadmapView ...
# Add setNorthStar, setObjectives, setStrategies
# AND STOP PASSING THE HANDLERS? The user prompt implies "Direct Implementation in RoadmapView.tsx", 
# which means using the setters I pass, but RoadmapView has to act on them.
# The previous prompt said: "If using props... logic directly into RoadmapView".
# So: I will pass setters, and I will REMOVE the old handlers?
# Or just pass the setters alongside? The prompt says "move logic directly into RoadmapView for now".
# This means I should pass the setters.

search_block = """           <RoadmapView 
             northStar={northStar}
             onUpdateNorthStar={handleUpdateNorthStar}
             objectives={objectives}
             strategies={strategies}
             experiments={experiments}
             onAddObjective={handleAddObjective}
             onAddStrategy={handleAddStrategy}
             onSelectExperiment={setSelectedExperiment}
           />"""

replace_block = """           <RoadmapView 
             northStar={northStar}
             setNorthStar={setNorthStar}
             objectives={objectives}
             setObjectives={setObjectives}
             strategies={strategies}
             setStrategies={setStrategies}
             experiments={experiments}
             onSelectExperiment={setSelectedExperiment}
           />"""

if search_block in app_content:
    app_content = app_content.replace(search_block, replace_block)
    # Also I should probably remove the handleUpdateNorthStar definition to avoid confusion? 
    # Or keep it as dead code. The user says "re-structuración completa".
    # I'll leave the handlers in App.tsx but they won't be used by RoadmapView anymore.
    
    with open(app_path, 'w') as f:
        f.write(app_content)
    print("Updated App.tsx to pass setters")
else:
    print("Could not find RoadmapView props to update")
