import os

roadmap_path = 'src/RoadmapView.tsx'

with open(roadmap_path, 'r') as f:
    content = f.read()

# 1. Change Prop Interface
# old: onUpdateNorthStar: (metric: NorthStarMetric) => void;
# new: onUpdateNorthStar: () => void;
content = content.replace(
    "onUpdateNorthStar: (metric: NorthStarMetric) => void;",
    "onUpdateNorthStar: () => void;"
)

# 2. Remove local handleEditNorthStar
# We can just remove the function block if we find it.
# Or simpler, we just find the Pencil Icon onClick and change it directly.
# And we can leave the dead code or remove it. Better to remove it to avoid confusion.

# Let's target the exact user instruction: "Locate the Pencil Icon... onClick MUST be {onUpdateNorthStar}"
pencil_old = """          <button 
            onClick={handleEditNorthStar}
            style={{ 
              background: 'rgba(255,255,255,0.1)',"""

pencil_new = """          <button 
            onClick={onUpdateNorthStar}
            style={{ 
              background: 'rgba(255,255,255,0.1)',"""

if pencil_old in content:
    content = content.replace(pencil_old, pencil_new)
    print("Updated Pencil onClick")
else:
    print("Pencil onClick already correct or not found")


# 3. Ensure Objective Button is correct
# "Locate the "+ New Objective" button. Its onClick MUST be {onAddObjective}."
# It likely already is, but let's verify.
# <button 
#   onClick={onAddObjective}
if "onClick={onAddObjective}" in content:
    print("Objective button correct")
else:
    print("Objective button needs fix") # It should be there from previous step

# 4. Ensure Strategy Button is correct
# "Locate the "+ Add Strategy" button. Its onClick MUST be {() => onAddStrategy(objective.id)}."
# Previous code: onClick={() => onAddStrategy(objective.id)}
if "onClick={() => onAddStrategy(objective.id)}" in content:
    print("Strategy button correct")
else:
    print("Strategy button needs fix")

with open(roadmap_path, 'w') as f:
    f.write(content)

