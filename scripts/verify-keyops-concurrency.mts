/**
 * P5-14 并发取证：3 个进程各写 100 条 key-ops，读回应 300。
 * 用法：bun run scripts/verify-keyops-concurrency.mts
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const REPO = join(import.meta.dir, '..');
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const storeDir = join(REPO, 'logs', `keyops-concurrent-${ts}`);
mkdirSync(storeDir, { recursive: true });

const keyOpsPath = join(REPO, 'src', 'bff', 'aggregators', 'keyOpsStore.ts').replace(/\\/g, '/');

const workerFile = join(storeDir, 'worker.ts');
writeFileSync(workerFile, `
import { appendKeyOp } from '${keyOpsPath}';
const n = Number(process.argv[2] ?? '100');
for (let i = 0; i < n; i++) {
  appendKeyOp({ actorId: 'actor-' + process.pid + '-' + i, action: 'retire', keyId: 'k-' + process.pid + '-' + i, result: 'ok', refs: null });
}
console.log('wrote', n);
`, 'utf8');

const procs: Promise<void>[] = [];
for (let w = 0; w < 3; w++) {
  const p = new Promise<void>((resolve) => {
    const child = spawn('C:\\Users\\lenovo\\.bun\\bin\\bun.exe', ['run', workerFile, '100'], {
      cwd: REPO,
      env: { ...process.env, WORM_STORE_DIR: storeDir } as any,
      stdio: 'inherit',
    });
    child.on('exit', () => resolve());
  });
  procs.push(p);
}
await Promise.all(procs);

const { readKeyOps, appendKeyOp } = await import(keyOpsPath);
process.env.WORM_STORE_DIR = storeDir;
const result = readKeyOps(0);
console.log('--- concurrency result ---');
console.log('ops read back:', result.ops.length, '(expected 300)');
console.log('files:', result.files);
console.log('malformed:', result.malformed);
const ids = new Set(result.ops.map((o) => o.actorId));
console.log('unique actorIds:', ids.size, '(expected 300)');
console.log('sorted ascending:', result.ops.every((op, i, arr) => i === 0 || arr[i-1].at <= op.at));

// 边写边读
console.log('--- concurrent reader ---');
const writerDone = (async () => {
  for (let i = 0; i < 200; i++) {
    appendKeyOp({ actorId: 'stream-' + i, action: 'purge', keyId: 'sk-' + i, result: 'ok', refs: 1 });
    await new Promise((r) => setTimeout(r, 5));
  }
})();
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 20));
  readKeyOps(50);
}
await writerDone;
const final = readKeyOps(0);
const finalStream = final.ops.filter((o) => o.actorId.startsWith('stream-'));
console.log('streamed ops final:', finalStream.length, '(expected 200)');

rmSync(storeDir, { recursive: true, force: true });
const ok = result.ops.length === 300 && finalStream.length === 200;
console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
