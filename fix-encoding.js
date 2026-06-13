const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp);
    else if (f.name === 'route.ts') {
      let c = fs.readFileSync(fp, 'utf8');
      const target = "export const runtime = 'nodejs';";
      if (c.includes(target)) {
        c = c.split('\n').filter(line => !line.includes(target)).join('\n');
        fs.writeFileSync(fp, c, 'utf8');
        console.log('Fixed: ' + fp);
      }
    }
  }
}

walk('src/app/api');
console.log('Done');
