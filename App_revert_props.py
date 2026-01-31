import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    content = f.read()

# Replace RoadmapView props
old_props = """           <RoadmapView 
             northStar={northStar}
             setNorthStar={setNorthStar}
             objectives={objectives}
             setObjectives={setObjectives}
             strategies={strategies}
             setStrategies={setStrategies}
             experiments={experiments}
             onSelectExperiment={setSelectedExperiment}
           />"""

new_props = """           <RoadmapView 
             northStar={northStar}
             onUpdateNorthStar={handleUpdateNorthStar}
             objectives={objectives}
             strategies={strategies}
             experiments={experiments}
             onAddObjective={handleAddObjective}
             onAddStrategy={handleAddStrategy}
             onSelectExperiment={setSelectedExperiment}
           />"""

if old_props in content:
    content = content.replace(old_props, new_props)
    with open(app_path, 'w') as f:
        f.write(content)
    print("Updated App.tsx props")
else:
    print("Could not find App.tsx props to replace")
