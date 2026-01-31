import os

app_path = 'src/App.tsx'

with open(app_path, 'r') as f:
    lines = f.readlines()

new_lines = []
seen_ns_log = False
seen_strat_log = False

for line in lines:
    if 'console.log("Button clicked in 01. Design: Update North Star");' in line:
        if seen_ns_log:
            continue # Skip duplicate
        seen_ns_log = True
    
    if 'console.log("Button clicked in 01. Design: Add Strategy");' in line:
        if seen_strat_log:
            continue
        seen_strat_log = True
        
    new_lines.append(line)

with open(app_path, 'w') as f:
    f.writelines(new_lines)

print("Cleaned up duplicate logs")
