const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '..');
const outputFile = path.join(__dirname, 'contracts-data.js');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (file === 'viewer' || file.startsWith('.')) return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFilePaths = getAllFiles(contractsDir);
const contractsData = [];

allFilePaths.forEach((filePath) => {
  const relPath = path.relative(contractsDir, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  
  let category = 'Root Policies';
  if (/optimization|performance-baseline/i.test(relPath)) category = 'Optimization';
  else if (relPath.startsWith('contracts/')) category = 'Contracts';
  else if (relPath.startsWith('state/')) category = 'State (YAML)';
  else if (relPath.startsWith('roadmap/')) category = 'Roadmap & Tickets';
  else if (relPath.startsWith('decisions/')) category = 'Architecture Decisions (ADR)';
  else if (relPath.startsWith('changes/')) category = 'Contract Change Requests (CCR)';
  else if (relPath.startsWith('audits/')) category = 'Audits';
  else if (relPath.startsWith('templates/')) category = 'Templates';
  else if (relPath.startsWith('learning/')) category = 'Learning Contracts';

  contractsData.push({
    id: relPath,
    title: path.basename(filePath, ext),
    filename: path.basename(filePath),
    path: relPath,
    category: category,
    extension: ext,
    content: content
  });
});

const fileContent = `// Auto-generated contracts data
window.AI_CONTRACTS_DATA = ${JSON.stringify(contractsData, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.AI_CONTRACTS_DATA;
}
`;

fs.writeFileSync(outputFile, fileContent, 'utf-8');
console.log(`Successfully compiled ${contractsData.length} files into ${outputFile}`);
