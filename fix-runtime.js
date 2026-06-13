const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  
  // Remove existing edge runtime lines
  c = c.replace(/export const runtime = 'edge';\n\n?/g, '');
  c = c.replace(/export const runtime = 'edge';\r?\n/g, '');
  
  // Check if file has 'use client'
  if (c.includes("'use client'")) {
    // Put 'use client' first, then edge runtime after it
    c = c.replace("'use client';", "'use client';\n\nexport const runtime = 'edge';");
  } else {
    // No 'use client', just add edge runtime at top
    c = "export const runtime = 'edge';\n\n" + c;
  }
  
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Fixed: ' + filePath);
}

// Fix all page.tsx files
function walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp);
    else if (f.name === 'page.tsx') fixFile(fp);
  }
}
walk('src/app');

// Fix not-found.tsx
const notFound = 'src/app/not-found.tsx';
if (fs.existsSync(notFound)) fixFile(notFound);

// Fix layout.tsx
const layout = 'src/app/layout.tsx';
if (fs.existsSync(layout)) fixFile(layout);

console.log('All done');
