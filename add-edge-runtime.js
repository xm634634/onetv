const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp);
    else if (f.name === 'route.ts') {
      let c = fs.readFileSync(fp, 'utf8');
      if (!c.includes("export const runtime")) {
        c = "export const runtime = 'edge';\n\n" + c;
        fs.writeFileSync(fp, c, 'utf8');
        console.log('Added: ' + fp);
      }
    }
  }
}
walk('src/app/api');
console.log('Done');
