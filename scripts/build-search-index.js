// One-time / re-runnable script: builds study-hub/search-index.json, a flat
// index of every chapter across every course (course pages array + template
// bodies), so a single global search box can jump to any topic in any course.
// Run with: node scripts/build-search-index.js
// Re-run this whenever a course file's pages/templates change.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const studyHubDir = path.join(root, 'study-hub');

function stripTags(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPagesArray(html) {
  const m = html.match(/const pages = \[([\s\S]*?)\n\];/);
  if (!m) return [];
  const body = m[1];
  const entries = [];
  const re = /\{id:"([^"]+)",\s*icon:"([^"]*)",\s*title:"([^"]*)"\}/g;
  let em;
  while ((em = re.exec(body))) {
    entries.push({ id: em[1], icon: em[2], title: em[3] });
  }
  return entries;
}

function extractTemplates(html) {
  const templates = {};
  const re = /<template data-page="([^"]+)">([\s\S]*?)<\/template>/g;
  let m;
  while ((m = re.exec(html))) {
    templates[m[1]] = m[2];
  }
  return templates;
}

// Course metadata (title/icon/accent/href) from the dashboard's topics array.
function extractCourseMeta() {
  const indexHtml = fs.readFileSync(path.join(studyHubDir, 'index.html'), 'utf-8');
  const m = indexHtml.match(/const topics = \[([\s\S]*?)\n\];/);
  const body = m[1];
  const courses = [];
  const re = /\{\s*id:"([^"]+)",\s*icon:"([^"]*)",\s*title:"([^"]*)",\s*accent:"([^"]*)",[\s\S]*?ready:(true|false)(?:,\s*href:"([^"]*)")?/g;
  let em;
  while ((em = re.exec(body))) {
    const [, id, icon, title, accent, ready, href] = em;
    if (ready === 'true' && href) {
      courses.push({ id, icon, title, accent, href });
    }
  }
  return courses;
}

const courses = extractCourseMeta();
const chapters = [];

for (const course of courses) {
  const filePath = path.join(studyHubDir, course.href);
  if (!fs.existsSync(filePath)) {
    console.warn('Skipping missing file:', course.href);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf-8');
  const pages = extractPagesArray(html);
  const templates = extractTemplates(html);

  for (const p of pages) {
    const raw = templates[p.id] || '';
    const text = stripTags(raw);
    chapters.push({
      file: course.href,
      courseId: course.id,
      courseTitle: course.title,
      courseIcon: course.icon,
      courseAccent: course.accent,
      id: p.id,
      icon: p.icon,
      title: p.title,
      text,
    });
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  courses,
  chapters,
};

const outPath = path.join(studyHubDir, 'search-index.json');
fs.writeFileSync(outPath, JSON.stringify(output), 'utf-8');

console.log(`Indexed ${chapters.length} chapters across ${courses.length} courses.`);
console.log('Written to', path.relative(root, outPath));
