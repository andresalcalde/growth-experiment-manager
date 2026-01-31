import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    content = f.read()

# 1. Branding: GrowthOS -> Growth Lab
branding_search = "<span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>GrowthOS</span>"
branding_replace = "<span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>Growth Lab</span>"

if branding_search in content:
    content = content.replace(branding_search, branding_replace)
    print("Updated Branding to Growth Lab")
else:
    print("Could not find Branding tag")

# 2. Add Logging and Functional Updates

# handleAddObjective
start_obj = "  const handleAddObjective = () => {"
replace_obj = """  const handleAddObjective = () => {
    console.log("Button clicked in 01. Design: New Objective");"""

if start_obj in content and "Button clicked" not in content:
    content = content.replace(start_obj, replace_obj)
    print("Updated handleAddObjective logging")


# handleUpdateNorthStar
# Search for the block start and replace the whole function logic or just insert log.
# User wants functional update too.
ns_search_start = "  const handleUpdateNorthStar = () => {"
ns_search_end = "  };"
# This is risky with simple replace if there are nested braces matching end.
# But indentation is key.
# I'll just replace the start and the setState part.

if ns_search_start in content:
    content = content.replace(ns_search_start, """  const handleUpdateNorthStar = () => {
    console.log("Button clicked in 01. Design: Update North Star");""")
    
    # Replace setState block
    state_search = """    setNorthStar({
      ...northStar,
      name: newName || northStar.name,
      currentValue: parseFloat(newCurrent.replace(/,/g, '')) || northStar.currentValue,
      targetValue: parseFloat(newTarget.replace(/,/g, '')) || northStar.targetValue
    });"""
    
    state_replace = """    setNorthStar(prev => ({
      ...prev,
      name: newName || prev.name,
      currentValue: parseFloat(newCurrent.replace(/,/g, '')) || prev.currentValue,
      targetValue: parseFloat(newTarget.replace(/,/g, '')) || prev.targetValue
    }));"""
    
    if state_search in content:
        content = content.replace(state_search, state_replace)
        print("Updated setNorthStar to functional update")
    else:
        print("Could not find setNorthStar block")
        
    print("Updated handleUpdateNorthStar logging")


# handleAddStrategy
start_strat = "  const handleAddStrategy = (objectiveId: string) => {"
replace_strat = """  const handleAddStrategy = (objectiveId: string) => {
    console.log("Button clicked in 01. Design: Add Strategy");"""

if start_strat in content:
    content = content.replace(start_strat, replace_strat)
    print("Updated handleAddStrategy logging")


with open(app_path, 'w') as f:
    f.write(content)
