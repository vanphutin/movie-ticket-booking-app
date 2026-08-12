/**
 * docs-viewer/build-data.js
 * Quét toàn bộ tài liệu (.md, .yml, .yaml) trong repo và biên dịch thành docs-data.js
 * cho giao diện docs-viewer. Chạy: node docs-viewer/build-data.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const outputFile = path.join(__dirname, 'docs-data.js');

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'docs-viewer', '.claude', 'scratchpad']);
const INCLUDED_EXTS = new Set(['.md', '.yml', '.yaml']);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if (EXCLUDED_DIRS.has(file) || file.startsWith('.')) return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (INCLUDED_EXTS.has(path.extname(file).toLowerCase())) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const AI_SUB_MAP = {
  contracts: 'Contracts',
  changes: 'Change Requests (CCR)',
  decisions: 'Decisions (ADR)',
  designs: 'Designs (Thiết kế)',
  'expected-files': 'Expected Files (Manifest)',
  learning: 'Learning',
  readiness: 'Readiness Checklists',
  roadmap: 'Roadmap',
  schemas: 'Schemas (JSON/YAML)',
  state: 'State (YAML)',
  templates: 'Templates',
  traceability: 'Traceability Matrix',
  audits: 'Audits',
  viewer: 'Viewer'
};

const DOCS_SUB_MAP = {
  plan: 'Kế hoạch tổng thể',
  'product-backlog': 'Product Backlog',
  database: 'Database Design',
  'curriculum-upgrade': 'Curriculum Upgrade',
  diagrams: 'Diagrams'
};

function formatSubName(key) {
  if (!key) return '';
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function classify(relPath) {
  const parts = relPath.split('/');
  if (parts[0] === 'AI-contracts') {
    if (parts.length === 2) {
      return { group: 'AI Contracts', sub: /^\d{2}-/.test(parts[1]) ? 'Policies (00–22)' : 'Tổng quan' };
    }
    const subName = AI_SUB_MAP[parts[1]] || formatSubName(parts[1]);
    return { group: 'AI Contracts', sub: subName };
  }
  if (parts[0] === 'docs') {
    if (parts.length === 2) return { group: 'Docs', sub: 'Chung' };
    const subName = DOCS_SUB_MAP[parts[1]] || formatSubName(parts[1]);
    return { group: 'Docs', sub: subName };
  }
  return { group: 'Gốc dự án', sub: 'Root' };
}

function extractTitle(content, filename, ext) {
  if (ext === '.md') {
    const lines = content.split('\n');
    for (const line of lines) {
      const m = line.match(/^#\s+(.+)/);
      if (m) return m[1].replace(/[*_`]/g, '').trim();
    }
  }
  return filename;
}

const GROUP_ORDER = ['Gốc dự án', 'AI Contracts', 'Docs'];
const SUB_ORDER = {
  'Gốc dự án': ['Root'],
  'AI Contracts': [
    'Tổng quan',
    'Policies (00–22)',
    'Contracts',
    'Change Requests (CCR)',
    'Decisions (ADR)',
    'Designs (Thiết kế)',
    'Expected Files (Manifest)',
    'Readiness Checklists',
    'Roadmap',
    'Learning',
    'Schemas (JSON/YAML)',
    'State (YAML)',
    'Templates',
    'Traceability Matrix',
    'Audits',
    'Viewer'
  ],
  Docs: [
    'Kế hoạch tổng thể',
    'Chung',
    'Product Backlog',
    'Database Design',
    'Curriculum Upgrade',
    'Diagrams'
  ]
};

function buildDocsDataPayload(targetRoot) {
  const root = targetRoot || repoRoot;
  const allFilePaths = getAllFiles(root);
  const entries = [];

  allFilePaths.forEach((filePath) => {
    const relPath = path.relative(root, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();
    // Repository text may be checked out as CRLF on Windows and LF on Linux. Embed a
    // canonical LF representation so the generated index is byte-identical everywhere.
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n?/g, '\n');
    const filename = path.basename(filePath);
    const { group, sub } = classify(relPath);

    entries.push({
      path: relPath,
      filename,
      ext,
      group,
      sub,
      title: extractTitle(content, filename, ext),
      // Filesystem mtimes change on every clean checkout and differ between Windows and
      // Linux runners. A date embedded in a versioned path is stable repository data.
      mtime: relPath.match(/(?:^|\/)(\d{4}-\d{2}-\d{2})(?:[-_/]|$)/)?.[1] || '',
      words: content.split(/\s+/).filter(Boolean).length,
      content
    });
  });

  entries.sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (g !== 0) return g;
    const subOrder = SUB_ORDER[a.group] || [];
    const idxA = subOrder.indexOf(a.sub);
    const idxB = subOrder.indexOf(b.sub);
    const posA = idxA >= 0 ? idxA : 999;
    const posB = idxB >= 0 ? idxB : 999;
    if (posA !== posB) return posA - posB;
    const s = a.sub.localeCompare(b.sub, undefined, { numeric: true });
    if (s !== 0) return s;
    return a.path.localeCompare(b.path, undefined, { numeric: true });
  });

  const latestSourceDate = entries.reduce(
    (latest, entry) => (entry.mtime > latest ? entry.mtime : latest),
    ''
  );
  const payload = {
    // Derive metadata from the indexed sources so repeated control-plane checks
    // produce byte-identical output when repository data has not changed.
    generatedAt: latestSourceDate ? `${latestSourceDate} 00:00` : '',
    files: entries
  };

  return (
    '// File này được generate bởi docs-viewer/build-data.js — không sửa tay.\n' +
    'window.DOCS_DATA = ' +
    JSON.stringify(payload, null, 0).replace(/<\/script/gi, '<\\/script') +
    ';\n'
  );
}

function compileToFile(targetRoot, outPath) {
  const root = targetRoot || repoRoot;
  const targetOutput = outPath || outputFile;
  const js = buildDocsDataPayload(root);
  fs.writeFileSync(targetOutput, js, 'utf-8');
  return js;
}

if (require.main === module) {
  compileToFile();
  console.log(`Compiled documents into ${outputFile}`);
}

module.exports = {
  buildDocsDataPayload,
  compileToFile
};
