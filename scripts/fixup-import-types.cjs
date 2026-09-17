/**
 * 修正脚本：将 codemod 误插入多行 import 块中的 `import type {...}` 行，
 * 移动到文件中最后一个完整 import 语句之后。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
let fixed = 0;

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const files = walk(ROOT, []);
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const typeImports = [];
  const kept = [];
  for (const line of lines) {
    if (/^import type \{.*\} from '.*';$/.test(line.trim())) {
      typeImports.push(line.trim());
    } else {
      kept.push(line);
    }
  }
  if (typeImports.length === 0) continue;

  // 找最后一个完整 import 语句结束的行索引：
  // 逐行扫描，跟踪是否处于多行 import 中。import 语句以行尾 ; 结束。
  let insertAfter = -1;
  let inImport = false;
  for (let i = 0; i < kept.length; i++) {
    const line = kept[i];
    if (/^\s*import\s/.test(line)) inImport = true;
    if (inImport) {
      if (line.trimEnd().endsWith(';')) {
        insertAfter = i;
        inImport = false;
      }
    }
  }
  if (insertAfter === -1) insertAfter = 0; // 无 import，插到头部

  // 去重 typeImports
  const unique = [...new Set(typeImports)];
  kept.splice(insertAfter + 1, 0, ...unique);
  fs.writeFileSync(file, kept.join('\n'), 'utf8');
  fixed++;
}
console.log(`fixup done: ${fixed} files`);
