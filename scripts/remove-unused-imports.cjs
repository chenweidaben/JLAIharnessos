const fs = require('fs');
const path = require('path');

// 读取 ESLint JSON 报告，按文件收集未使用的导入标识符
const reportPath = path.join(process.env.TEMP, 'eslint_beA.json');
let raw = fs.readFileSync(reportPath, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const report = JSON.parse(raw);

const unusedByFile = new Map(); // absPath -> Set<names>
for (const f of report) {
  const set = new Set();
  for (const m of f.messages) {
    if (m.ruleId === '@typescript-eslint/no-unused-vars') {
      // message: "'X' is defined but never used..."
      const mm = /^'([^']+)'/.exec(m.message);
      if (mm) set.add(mm[1]);
    }
  }
  if (set.size) unusedByFile.set(f.filePath, set);
}

let removed = 0;
for (const [file, names] of unusedByFile) {
  let src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  // 逐行处理 import 行（单行或多行块）。简化：对每个 names 中的标识符，
  // 在 import 块的花括号内删除该标识符。
  // 我们用状态机跟踪 import { ... } 块。
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isImportStart = /^\s*import\b/.test(line);
    if (isImportStart && /\{\s*$/.test(line)) {
      // 多行 import 块：收集到 } 结束
      const block = [line];
      i++;
      while (i < lines.length && !/\}/.test(lines[i])) { block.push(lines[i]); i++; }
      if (i < lines.length) { block.push(lines[i]); i++; }
      // 处理 block：删除未使用标识符
      let blockText = block.join('\n');
      for (const name of names) {
        // 删除 { type Name, / Name, / , Name / , type Name }
        const re = new RegExp('(\\btype\\s+)?' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(blockText)) {
          // 删除 ", type Name" 或 "type Name," 或 ", Name" 或 "Name,"
          blockText = blockText
            .replace(new RegExp('\\s*,\\s*type\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '')
            .replace(new RegExp('\\s*,\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '')
            .replace(new RegExp('\\btype\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,\\s*'), '')
            .replace(new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,\\s*'), '');
          removed++;
        }
      }
      out.push(blockText);
    } else if (isImportStart && /\{.*\}/.test(line)) {
      // 单行 import { ... }
      let l = line;
      for (const name of names) {
        const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(l)) {
          l = l
            .replace(new RegExp('\\s*,\\s*type\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '')
            .replace(new RegExp('\\s*,\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), '')
            .replace(new RegExp('\\btype\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,\\s*'), '')
            .replace(new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,\\s*'), '');
          removed++;
        }
      }
      // 若花括号变空，跳过整行
      if (/\{\s*\}/.test(l)) { /* drop */ }
      else out.push(l);
      i++;
    } else {
      out.push(line);
      i++;
    }
  }
  fs.writeFileSync(file, out.join('\n'), 'utf8');
}
console.log('removed identifiers: ' + removed);
