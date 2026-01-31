const fs = require('fs');

const appPath = 'src/App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// Add imports after the first import line
const firstImportLine = content.indexOf("import React");
const importToAdd = `import React, { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useExperiments } from './hooks/useExperiments';
import { useNorthStar } from './hooks/useNorthStar';
`;

// Replace the first import
content = content.replace(/import React, { useState } from 'react';/, importToAdd);

fs.writeFileSync(appPath, content);
console.log('✅ Imports updated');

