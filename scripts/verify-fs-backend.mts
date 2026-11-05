/**
 * P5-13：WORM_BACKEND=fs 运行态验收脚本
 *
 * 跨进程重启验收：A seal 2 段 → 杀 A → 起 B → 读回 + 续 seal + verify。
 * SM2 密钥用 sm-crypto 现场生成（合法曲线点，验签能通过）；storeDir 每次独立子目录，跑完删除。
 *
 * 用法：bun run scripts/verify-fs-backend.mts
 */
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';

const REPO = join(import.meta.dir, '..');
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const storeDir = join(REPO, 'logs', `worm-fs-verify-${ts}`);
const port = 8099;
mkdirSync(storeDir, { recursive: true });

// 一次性测试密钥（脚本内生成，不打印、不落盘）
const sm4Key = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
const { sm2: sm2lib } = require('sm-crypto');
const kp = sm2lib.generateKeyPairHex();
const sm2Priv: string = kp.privateKey;
const sm2Pub: string = kp.publicKey;
const kek = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');

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
  const child = spawn('C:\\Users\\lenovo\\.bun\\bin\\bun.exe', ['run', 'src/bff/server.ts'], {
    cwd: REPO,
    env: {
      ...process.env,
      DEMO_MODE: '1',
      WORM_BACKEND: 'fs',
      WORM_STORE_DIR: storeDir,
      WORM_FILE_KEY: '1',
      WORM_SM4_KEY: sm4Key,
      WORM_SM2_PRIVATE_KEY: sm2Priv,
      WORM_SM2_PUBLIC_KEY: sm2Pub,
      WORM_KEK: kek,
      HTTP_PORT: String(port),
    } as any,
    stdio: 'ignore',
  });
  return child;
}

async function waitReady(): Promise<void> {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('BFF not ready in 20s');
}

async function main(): Promise<void> {
  async function adminToken(): Promise<string> {
    const r = await api('/api/v1/auth/demo-login', { method: 'POST', body: { role: 'admin' } });
    return r.data?.data?.tokens?.accessToken ?? r.data?.tokens?.accessToken ?? '';
  }

  // === 进程 A ===
  console.log('=== 进程 A ===');
  const a = startBff();
  await waitReady();
  const tokA = await adminToken();

  // A: seed 1 + seal 第一段
  await api('/api/v1/audit/events/_seed', { method: 'POST', token: tokA, body: { items: [
    { actorId: 'zhangmou', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n1', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
  ] } });
  const sealFirst = await api('/api/v1/worm/segments/seal', { method: 'POST', token: tokA, body: {} });
  const firstToSeq = sealFirst.data?.data?.toSeq ?? sealFirst.data?.toSeq;
  check('A-seal-1st', (sealFirst.status === 200 || sealFirst.status === 201) && firstToSeq >= 1, `status=${sealFirst.status} toSeq=${firstToSeq}`);

  // A: seed 另 1 + seal 第二段
  await api('/api/v1/audit/events/_seed', { method: 'POST', token: tokA, body: { items: [
    { actorId: 'limou', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n2', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
  ] } });
  const sealA = await api('/api/v1/worm/segments/seal', { method: 'POST', token: tokA, body: {} });
  const secondFrom = sealA.data?.data?.fromSeq ?? sealA.data?.fromSeq;
  check('A-seal-2nd', (sealA.status === 200 || sealA.status === 201) && secondFrom === firstToSeq + 1, `status=${sealA.status} fromSeq=${secondFrom} expected=${firstToSeq + 1}`);

  // 磁盘至少 2 个 WORM-*.json
  const files = readdirSync(storeDir).filter((f) => f.startsWith('WORM-') && f.endsWith('.json'));
  check('A-disk-2json', files.length === 2, `files=${files.length}`);

  // 杀 A
  a.kill();
  await new Promise((r) => setTimeout(r, 1500));

  // === 进程 B ===
  console.log('=== 进程 B ===');
  const b = startBff();
  await waitReady();
  const tokB = await adminToken();

  // B: /ready 应显示 wormBackend=fs
  const readyB = await api('/ready');
  check('B-ready-wormBackend-fs', readyB.data?.wormBackend === 'fs', `ready=${JSON.stringify(readyB.data)}`);

  // B: 读回 2 段
  const infoB = await api('/api/v1/worm/store/info', { token: tokB });
  const countB = infoB.data?.data?.segmentCount ?? infoB.data?.segmentCount;
  check('B-store-count2', countB === 2, `count=${countB}`);

  // B: seed 1 新事件 + seal 第三段（fromSeq 应接上一段 toSeq+1）
  await api('/api/v1/audit/events/_seed', { method: 'POST', token: tokB, body: { items: [
    { actorId: 'wangmou', actorRole: 'doctor', action: 'create', module: 'emr', resourceType: 'note', resourceId: 'n3', result: 'success', ip: '1.1.1.1', userAgent: 'ua' },
  ] } });
  await new Promise((r) => setTimeout(r, 500));
  const sealB = await api('/api/v1/worm/segments/seal', { method: 'POST', token: tokB, body: {} });
  const bFrom = sealB.data?.data?.fromSeq ?? sealB.data?.fromSeq;
  const bStatus = sealB.status;
  check('B-seal-after-restart', (bStatus === 200 || bStatus === 201) && typeof bFrom === 'number', `status=${bStatus} fromSeq=${bFrom}`);

  // B: verify real
  const v = await api('/api/v1/worm/verify?scope=real', { method: 'POST', token: tokB, body: {} });
  const vValid = v.data?.data?.valid ?? v.data?.valid;
  const vGaps = v.data?.data?.seqContinuity?.gaps ?? v.data?.seqContinuity?.gaps ?? v.data?.gaps ?? [];
  const vSegments = v.data?.data?.segmentCount ?? v.data?.segmentCount;
  check('B-verify-valid', vValid === true, `valid=${vValid}`);
  check('B-verify-no-gaps', Array.isArray(vGaps) && vGaps.length === 0, `gaps=${JSON.stringify(vGaps)}`);
  check('B-verify-segmentCount3', vSegments === 3, `segmentCount=${vSegments}`);

  // /metrics 计数器
  const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
  const metricsText = await metricsRes.text();
  const hasCounter = /^jlmedaios_audit_persist_failed_total\s+0$/m.test(metricsText);
  check('metrics-audit-persist-0', hasCounter, 'counter literal not found');

  b.kill();

  // 清理独立 storeDir
  try { rmSync(storeDir, { recursive: true, force: true }); } catch { /* ignore */ }

  const failed = results.filter((r) => !r.pass);
  if (failed.length === 0) {
    console.log('RESULT: PASS (8/8)');
    process.exit(0);
  }
  console.log(`RESULT: FAIL (${failed.length}/8)`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
