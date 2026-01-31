import os

file_path = 'src/App.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update ExperimentDrawer props
content = content.replace(
    "  onClose,\n  onStatusChange\n}: {",
    "  onClose,\n  onStatusChange,\n  onIceUpdate\n}: {\n"
)
content = content.replace(
    "  onStatusChange: (id: string, newStatus: Status) => void;\n}) => {",
    "  onStatusChange: (id: string, newStatus: Status) => void;\n  onIceUpdate?: (field: 'impact' | 'confidence' | 'ease', val: number) => void;\n}) => {"
)

# 2. Update ICE Score display (Regex or simple string replace if exact match)
# We will use simple replace for the map structure
content = content.replace(
    "{ label: 'Impact', value: experiment.impact },\n                      { label: 'Confidence', value: experiment.confidence },\n                      { label: 'Ease', value: experiment.ease }\n                    ].map(score => (",
    "(['impact', 'confidence', 'ease'] as const).map(key => {\n                      const score = { label: key.charAt(0).toUpperCase() + key.slice(1), value: experiment[key] };\n                      return ("
)

content = content.replace(
    "<div className=\"score-bar\">\n                          <div className=\"score-fill\" style={{ width: (score.value * 10) + '%' }}></div>\n                        </div>",
    "<input type=\"range\" min=\"0\" max=\"10\" value={score.value} onChange={(e) => onIceUpdate && onIceUpdate(key, Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />"
)

# 3. Add Conclude Button
# Find the end of visual proof section or tab content
insert_marker = "             </div>\n            </div>\n          )}\n        </div>"
# The structure might differ slightly due to my previous reading. Let's target the closing of the execution tab.
# It ends with:
#               </div>
#             </div>
#           )}
#         </div>

# We want to insert BEFORE the closing brace of the execution tab condition
# "          )}\n        </div>\n      </div>\n    </div>\n  );\n};"

# Actually let's use the Visual Proof end.
content = content.replace(
    "                    )}\n                 </div>\n              </div>\n            </div>",
    "                    )}\n                 </div>\n              </div>\n              <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}><button onClick={() => onStatusChange(experiment.id, 'Finished - Winner')} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><CheckCircle2 size={18} />Conclude & Archive Experiment</button><div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>This will move the experiment to the Library</div></div>\n            </div>"
)

# 4. Filter Logic
content = content.replace(
    "const filteredExperiments = experiments.filter(e => \n    e.title.toLowerCase().includes(searchQuery.toLowerCase())\n  );",
    "const filteredExperiments = experiments.filter(e => \n    e.title.toLowerCase().includes(searchQuery.toLowerCase())\n  );\n  const activeExperiments = filteredExperiments.filter(e => !e.status.includes('Finished'));"
)

# 5. Update Kanban and Table usage
content = content.replace(
    "experiments={filteredExperiments.filter(e => e.status === status)}",
    "experiments={activeExperiments.filter(e => e.status === status)}"
)

content = content.replace(
    "const tableExperiments = [...filteredExperiments].sort",
    "const tableExperiments = [...activeExperiments].sort"
)

# 6. Pass onIceUpdate
content = content.replace(
    "            onStatusChange={handleStatusChangeAttempt}\n        />",
    "            onStatusChange={handleStatusChangeAttempt}\n            onIceUpdate={(field, val) => updateIceScore(selectedExperiment.id, field, val)}\n        />"
)

with open(file_path, 'w') as f:
    f.write(content)
