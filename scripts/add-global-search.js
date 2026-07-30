// One-time script: adds <script src="global-search.js"></script> to every
// study-hub page (course pages + dashboard), right before the service-worker
// registration script, so the global cross-course search box is available
// everywhere. Run with: node scripts/add-global-search.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const studyHubDir = path.join(root, 'study-hub');

const files = fs.readdirSync(studyHubDir).filter((f) => f.endsWith('.html'));

const SNIPPET = '<script src="global-search.js"></script>\n';

let changed = 0;
for (const rel of files) {
  const full = path.join(studyHubDir, rel);
  let html = fs.readFileSync(full, 'utf-8');

  if (html.includes('global-search.js')) continue;

  const before = html;
  if (html.includes('</body>')) {
    html = html.replace('</body>', SNIPPET + '</body>');
  }

  if (html !== before) {
    fs.writeFileSync(full, html, 'utf-8');
    changed++;
    console.log('updated:', rel);
  }
}
console.log(`\nDone. ${changed}/${files.length} files updated.`);
