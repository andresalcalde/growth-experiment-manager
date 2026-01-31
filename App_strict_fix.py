import os

app_path = 'src/App.tsx'

# 1. Update App.tsx to include handleUpdateNorthStar
with open(app_path, 'r') as f:
    app_content = f.read()

# We need to insert the handler BEFORE the return statement, preferably near other handlers
# Currently prompt logic is in RoadmapView, we will move it here.

handler_insert_point = """  const handleAddStrategy = (objectiveId: string) => {"""
# We search for this start

new_update_handler = """  const handleUpdateNorthStar = () => {
    const newName = window.prompt("Enter Metric Name:", northStar.name);
    if (newName === null) return;
    
    const newCurrent = window.prompt("Enter Current Value:", northStar.currentValue.toString());
    if (newCurrent === null) return;

    const newTarget = window.prompt("Enter Target Value:", northStar.targetValue.toString());
    if (newTarget === null) return;

    setNorthStar({
      ...northStar,
      name: newName || northStar.name,
      currentValue: parseFloat(newCurrent.replace(/,/g, '')) || northStar.currentValue,
      targetValue: parseFloat(newTarget.replace(/,/g, '')) || northStar.targetValue
    });
  };

  const handleAddStrategy = (objectiveId: string) => {"""

if handler_insert_point in app_content:
    app_content = app_content.replace(handler_insert_point, new_update_handler)
    
    # 2. Update props passed to RoadmapView
    # Look for onUpdateNorthStar={setNorthStar}
    # Replace with onUpdateNorthStar={handleUpdateNorthStar} -- WAIT
    # RoadmapView expects (metric: NorthStarMetric) => void currently.
    # The USER SAYS: "Locate the Pencil Icon (North Star). Its onClick MUST be {onUpdateNorthStar}."
    # This implies onUpdateNorthStar in RoadmapView is () => void.
    
    # So we must change the signature in RoadmapView.tsx too.
    
    if "onUpdateNorthStar={handleUpdateNorthStar}" not in app_content:
        # replace the old prop usage
        app_content = app_content.replace("onUpdateNorthStar={setNorthStar}", "onUpdateNorthStar={handleUpdateNorthStar}")
    
    with open(app_path, 'w') as f:
        f.write(app_content)
    print("Updated App.tsx with handleUpdateNorthStar")
else:
    print("Could not find insertion point in App.tsx")
