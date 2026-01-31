import os

file_path = 'src/App.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip_count = 0

for i, line in enumerate(lines):
    if skip_count > 0:
        skip_count -= 1
        continue
    
    # Detect the START of the injected block
    if "const updateFunnelStage =" in line:
        # Check if it looks like our injection
        if i + 1 < len(lines) and "setExperiments(prev => prev.map" in lines[i+1]:
            # It is our block. Use a heuristic to skip the body + closing brace.
            # My injection was 3 lines: definition, body, closure.
            # But wait, did I insert newlines before it? Yes.
            # The previous line might have been "};".
            # The injection was "};\n\n  const ..."
            # So I just need to remove the definition line, the body line, and the closing brace line.
            skip_count = 2 # Skip this line (i), then i+1, i+2. Total 3 lines.
            
            # Note: I might leave extra newlines, which is fine.
            continue
    
    new_lines.append(line)

# Write back
with open(file_path, 'w') as f:
    f.writelines(new_lines)
