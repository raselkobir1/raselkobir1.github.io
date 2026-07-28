// One-time script: inject PWA manifest link + service worker registration
// into every HTML page so the whole site becomes available offline after
// a single online visit. Run with: node scripts/add-offline-support.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'index.html',
  ...fs.readdirSync(path.join(root, 'study-hub'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join('study-hub', f)),
];

const HEAD_SNIPPET = [
  '<link rel="manifest" href="/manifest.json">',
  '<meta name="theme-color" content="#0d1117">',
].join('\n');

const BODY_SNIPPET = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
</script>`;

let changed = 0;
for (const rel of files) {
  const full = path.join(root, rel);
  let html = fs.readFileSync(full, 'utf-8');
  const before = html;

  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', `${HEAD_SNIPPET}\n</head>`);
  }
  if (!html.includes("serviceWorker.register")) {
    html = html.replace('</body>', `${BODY_SNIPPET}\n</body>`);
  }

  if (html !== before) {
    fs.writeFileSync(full, html, 'utf-8');
    changed++;
    console.log('updated:', rel);
  }
}
console.log(`\nDone. ${changed}/${files.length} files updated.`);
