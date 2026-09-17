const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
let added = 0;

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

const header = (rel) =>
  `/**\n` +
  ` * 健澜科技数智医院智能体 - ${rel}\n` +
  ` *\n` +
  ` * Copyright (c) 2026 健澜科技. All rights reserved.\n` +
  ` */\n\n`;

for (const file of walk(ROOT, [])) {
  const src = fs.readFileSync(file, 'utf8');
  if (/Copyright/.test(src)) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  fs.writeFileSync(file, header(rel) + src, 'utf8');
  added++;
}
console.log('copyright header added: ' + added);
