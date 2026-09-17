/**
 * 一次性 codemod：将内联 `import('path').Type` 类型注解转换为顶部 `import type`。
 * 仅处理 src/**.ts，不改动运行时逻辑，只移动类型引用位置。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
let filesChanged = 0;
let refsChanged = 0;

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
  let src = fs.readFileSync(file, 'utf8');
  // 匹配 import('path').TypeName  （TypeName 后可接 <...> 或 [] 或 . 访问，这里只取标识符）
  const re = /import\(\s*['"]([^'"]+)['"]\s*\)\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const byPath = new Map(); // path -> Set<Type>
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    // 跳过 typeof 用法与 node:fs 这类值导入（保留原样）
    const before = src.slice(0, m.index);
    if (/\btypeof\s*$/.test(before)) continue;
    if (p.startsWith('node:') || p === 'fs' || p === 'path' || p === 'node:fs') continue;
    if (!byPath.has(p)) byPath.set(p, new Set());
    byPath.get(p).add(m[2]);
  }
  if (byPath.size === 0) continue;

  // 执行替换：import('path').Type -> Type
  let newSrc = src.replace(re, (full, p, type) => {
    if (!byPath.has(p)) return full; // 被跳过的保持原样
    return type;
  });
  refsChanged += 1;

  // 构造 import type 语句块
  const importLines = [];
  for (const [p, types] of byPath) {
    const sorted = [...types].sort();
    importLines.push(`import type { ${sorted.join(', ')} } from '${p}';`);
  }

  // 插入到文件第一个顶部 import 之后（简单策略：插入到最后一行以 import 开头的行之后）
  const lines = newSrc.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, ...importLines);
  } else {
    lines.unshift(...importLines);
  }
  newSrc = lines.join('\n');
  fs.writeFileSync(file, newSrc, 'utf8');
  filesChanged++;
}
console.log(`codemod done: ${filesChanged} files changed`);
