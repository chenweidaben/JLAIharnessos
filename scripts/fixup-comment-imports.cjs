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
  let lines = fs.readFileSync(file, 'utf8').split('\n');

  // 找文件头块注释结束行（第一个只含 */ 的行）
  let commentEnd = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].trim() === '*/') { commentEnd = i; break; }
  }
  if (commentEnd === -1) continue;

  // 收集注释块内（<= commentEnd）的 import type 行
  const orphan = [];
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (i <= commentEnd && /^\s*import type \{.*\} from '.*';\s*$/.test(ln)) {
      orphan.push(ln.trim());
    } else {
      kept.push(ln);
    }
  }
  if (orphan.length === 0) continue;

  // 重新定位注释结束行
  let newCommentEnd = -1;
  for (let i = 0; i < Math.min(kept.length, 20); i++) {
    if (kept[i].trim() === '*/') { newCommentEnd = i; break; }
  }
  const unique = [...new Set(orphan)];
  kept.splice(newCommentEnd + 1, 0, '', ...unique);
  fs.writeFileSync(file, kept.join('\n'), 'utf8');
  fixed++;
}
console.log('comment-fix done: ' + fixed + ' files');
