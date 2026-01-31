import os

file_path = 'src/App.tsx'

with open(file_path, 'r') as f:
    content = f.read()

old_ice_func = """  const updateIceScore = (id: string, field: 'impact' | 'confidence' | 'ease', val: number) => {
    setExperiments(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: val };

      updated.iceScore = updated.impact * updated.confidence * updated.ease;
      return updated;
    }));
  };"""

new_ice_func = """  const updateIceScore = (id: string, field: 'impact' | 'confidence' | 'ease', val: number) => {
    setExperiments(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: val };

      updated.iceScore = updated.impact * updated.confidence * updated.ease;
      return updated;
    }));

    if (selectedExperiment && selectedExperiment.id === id) {
       setSelectedExperiment(prev => {
          if (!prev) return null;
          const updated = { ...prev, [field]: val };
          updated.iceScore = updated.impact * updated.confidence * updated.ease;
          return updated;
       });
    }
  };"""

if old_ice_func in content:
    content = content.replace(old_ice_func, new_ice_func)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Fixed ICE update logic")
else:
    print("Could not find ICE update function")
