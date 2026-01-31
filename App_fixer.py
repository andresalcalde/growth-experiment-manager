import os

file_path = 'src/App.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Locate the bad block
# It starts with {[ and then the map
bad_block = """                    {[
                      (['impact', 'confidence', 'ease'] as const).map(key => {
                      const score = { label: key.charAt(0).toUpperCase() + key.slice(1), value: experiment[key] };
                      return (
                      <div key={score.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>{score.label}</span>
                          <span style={{ fontWeight: 600 }}>{score.value}/10</span>
                        </div>
                        <input type="range" min="0" max="10" value={score.value} onChange={(e) => onIceUpdate && onIceUpdate(key, Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                      </div>
                    ))}"""

good_block = """                    {(['impact', 'confidence', 'ease'] as const).map(key => {
                      const score = { label: key.charAt(0).toUpperCase() + key.slice(1), value: experiment[key] };
                      return (
                      <div key={score.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>{score.label}</span>
                          <span style={{ fontWeight: 600 }}>{score.value}/10</span>
                        </div>
                        <input type="range" min="0" max="10" value={score.value} onChange={(e) => onIceUpdate && onIceUpdate(key, Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                      </div>
                    )})}"""

if bad_block in content:
    content = content.replace(bad_block, good_block)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Fixed syntax error")
else:
    print("Could not find bad block to fix")
