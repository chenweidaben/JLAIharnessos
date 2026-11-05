/**
 * P5-12：WORM_BACKEND=fs 运行态验收脚本
 *
 * 跨进程重启验收：A seal 2 段 → 杀 A → 起 B → 读回 + 续 seal + verify。
 * 密钥在脚本内生成一次性测试值，落临时文件，跑完删除。不打印、不入库。
 *
 * 用法：bun run scripts/verify-fs-backend.mts
 */
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const REPO = join(import.meta.dir, '..');
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const storeDir = join(REPO, 'logs', `worm-fs-${ts}`);
const port = 8099;
mkdirSync(storeDir, { recursive: true });

// 一次性测试密钥（脚本内生成，不打印）
const sm4Key = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
const sm2Priv = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
const sm2Pub = '04' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
const kek = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
function check(name: string, pass: boolean, detail?: string): void {
  results.push({ name, pass, detail });
  console.log(`CHECK-${name}: ${pass ? 'PASS' : 'FAIL'}${detail ? ' | ' + detail : ''}`);
}

async function api(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function startBff(): ChildProcess {
  const child = spawn('C:\\Users\\lenovo\\.bun\\bin\\bun.exe', ['run', 'src/bff/index.ts'], {
    cwd: REPO,
    env: {
      ...process.env,
      DEMO_MODE: '1',
      WORM_BACKEND: 'fs',
      WORM_STORE_DIR: storeDir,
      WORM_SM4_KEY: sm4Key,
      WORM_SM2_PRIVATE_KEY: sm2Priv,
      WORM_SM2_PUBLIC_KEY: sm2Pub,
      WORM_KEK: kek,
      PORT: String(port),
    } as any,
    stdio: 'ignore',
  });
  return child;
}

async function waitReady(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      if (r.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('BFF not ready in 15s');
}

async function main(): Promise<void> {
  // 登录拿 admin token
  async function adminToken(): Promise<string> {
    const r = await api('/api/v1/auth/demo-login', { method: 'POST', body: { username: 'admin', password: 'x' } });
    return r.data?.token ?? '';
  }

  // === 进程 A ===
  console.log('=== 进程 A ===');
  const a = startBff();
  await waitReady();
  const tokA = await adminToken();

  // seed 2 事件 + seal 2 段
  await api('/api/v1/audit/events/_seed', { method: 'POST', token: tokA, body: { items: [
    { actorId: 'D1', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n1', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
    { actorId: 'D2', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n2', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
  ] } });
  const sealA = await api('/api/v1/worm/segments/seal', { method: 'POST', token: tokA, body: {} });
  check('A-seal-2segments', sealA.status === 200, `status=${sealA.status}`);

  // 磁盘目录 2 个 WORM-*.json
  const files = readdirSync(storeDir).filter((f) => f.startsWith('WORM-') && f.endsWith('.json'));
  check('A-disk-2json', files.length === 2, `files=${files.length}`);

  const infoA = await api('/api/v1/worm/store/info', { token: tokA });
  check('A-store-info-kind-fs', infoA.data?.kind === 'fs', `kind=${infoA.data?.kind}`);

  // 杀 A
  a.kill();
  await new Promise((r) => setTimeout(r, 1000));

  // === 进程 B ===
  console.log('=== 进程 B ===');
  const b = startBff();
  await waitReady();
  const tokB = await adminToken();

  const segsB = await api('/api/v1/worm/segments', { token: tokB });
  check('B-list-2segments', segsB.data?.segments?.length === 2, `count=${segsB.data?.segments?.length}`);
  const seqs = (segsB.data?.segments ?? []).map((s: any) => s.seq).sort();
  check('B-seq-1-2', seqs[0] === 1 && seqs[1] === 2, `seqs=${JSON.stringify(seqs)}`);

  const infoB = await api('/api/v1/worm/store/info', { token: tokB });
  check('B-store-info-fs-count2', infoB.data?.kind === 'fs' && infoB.data?.segmentCount === 2, `kind=${infoB.data?.kind} count=${infoB.data?.segmentCount}`);

  // 读回第一段内容
  const segId = segsB.data?.segments?.[0]?.segmentId;
  const content = await api(`/api/v1/worm/segments/${segId}/content`, { token: tokB });
  check('B-content-readable', content.status === 200 && (content.data?.events?.length ?? 0) > 0, `status=${content.status} events=${content.data?.events?.length}`);

  // 续 seal 第 3 段
  await api('/api/v1/audit/events/_seed', { method: 'POST', token: tokB, body: { items: [
    { actorId: 'D3', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n3', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
  ] } });
  const sealB = await api('/api/v1/worm/segments/seal', { method: 'POST', token: tokB, body: {} });
  check('B-seal-seq3', sealB.data?.segment?.seq === 3, `seq=${sealB.data?.segment?.seq}`);

  // verify real
  const v = await api('/api/v1/worm/verify?scope=real', { method: 'POST', token: tokB, body: {} });
  check('B-verify-valid', v.data?.valid === true, `valid=${v.data?.valid}`);
  check('B-verify-no-gaps', (v.data?.gaps ?? []).length === 0, `gaps=${JSON.stringify(v.data?.gaps)}`);

  b.kill();

  // 清理
  try { rmSync(storeDir, { recursive: true, force: true }); } catch { /* ignore */ }

  const failed = results.filter((r) => !r.pass);
  console.log(failed.length === 0 ? 'RESULT: ALL_PASS' : `RESULT: FAIL (${failed.length} items)`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
