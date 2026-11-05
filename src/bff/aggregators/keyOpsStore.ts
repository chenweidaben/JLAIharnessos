/**
 * 健澜AI原生医院操作系统OS - P5-14 运维审计流（key-ops）多实例安全存储
 *
 * 按实例分文件 + JSONL 追加：
 *   写： <WORM_STORE_DIR>/_key-ops-<instanceId>-<YYYYMMDD>.jsonl  appendFileSync 单行 JSON
 *   读： glob _key-ops-*.jsonl → 逐行解析（坏行跳过并计数 malformed）
 *       → 按 at 升序合并 → 取最近 limit 条
 *
 * 旧单文件 _key-ops.json 首次读取时幂等迁移：
 *   - 读旧文件 → 逐条 append 到当前实例今天的 jsonl
 *   - 旧文件 rename 为 _key-ops.json.migrated
 *   - 重复执行：已迁移的旧文件不存在，直接跳过，不重复写
 *
 * 绝不记录任何密钥值。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

export interface KeyOp {
  at: string;
  actorId: string;
  action: 'retire' | 'purge';
  keyId: string;
  result: string;
  refs: number | null;
}
export type KeyOpInput = Omit<KeyOp, 'at'>;

// 进程启动时生成一次：hostname-pid-rand6，保证多实例不撞文件
const INSTANCE_ID = `${hostname().replace(/[^a-zA-Z0-9]/g, '')}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

function storeDir(): string {
  return process.env.WORM_STORE_DIR || 'logs/worm-store';
}

function today(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function instanceOpsPath(): string {
  return join(storeDir(), `_key-ops-${INSTANCE_ID}-${today()}.jsonl`);
}

function legacyPath(): string {
  return join(storeDir(), '_key-ops.json');
}

export function __instanceId(): string { return INSTANCE_ID; }

/** 幂等迁移旧单文件格式：只在旧文件存在时执行一次，rename 后再跑不会重复。 */
function migrateLegacyIfPresent(): void {
  const oldP = legacyPath();
  if (!existsSync(oldP)) return;
  try {
    const arr = JSON.parse(readFileSync(oldP, 'utf8')) as KeyOp[];
    if (Array.isArray(arr) && arr.length > 0) {
      mkdirSync(storeDir(), { recursive: true });
      const newP = instanceOpsPath();
      const lines = arr.map((op) => JSON.stringify(op)).join('\n') + '\n';
      appendFileSync(newP, lines, 'utf8');
    }
    renameSync(oldP, oldP + '.migrated');
  } catch (e) {
    // 迁移失败不阻断主流程，但留痕；下次启动再试
    console.warn('[worm-key-ops] 旧格式迁移失败:', (e as Error).message);
  }
}

/** 单行追加写。同步是为了避免进程退出截断；单行 JSON 不跨行。 */
export function appendKeyOp(op: KeyOpInput): void {
  try {
    migrateLegacyIfPresent();
    const record: KeyOp = { at: new Date().toISOString(), ...op };
    mkdirSync(storeDir(), { recursive: true });
    appendFileSync(instanceOpsPath(), JSON.stringify(record) + '\n', 'utf8');
  } catch (e) {
    console.warn('[worm-key-ops] 运维审计写入失败，本条记录已丢失:', (e as Error).message);
  }
}

export interface KeyOpsReadResult {
  ops: KeyOp[];
  malformed: number;
  files: number;
}

/** 跨实例合并读：glob _key-ops-*.jsonl，逐行解析，坏行跳过并计数。 */
export function readKeyOps(limit: number): KeyOpsReadResult {
  migrateLegacyIfPresent();
  const dir = storeDir();
  let malformed = 0;
  const all: KeyOp[] = [];
  let files = 0;
  if (!existsSync(dir)) return { ops: [], malformed: 0, files: 0 };
  let names: string[] = [];
  try { names = readdirSync(dir); } catch { return { ops: [], malformed: 0, files: 0 }; }
  for (const name of names) {
    if (!name.startsWith('_key-ops-') || !name.endsWith('.jsonl')) continue;
    // 跳过其他实例今天之前的迁移文件、以及 .migrated 旧文件
    files++;
    const p = join(dir, name);
    let content = '';
    try { content = readFileSync(p, 'utf8'); } catch { continue; }
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed) as KeyOp;
        if (obj && typeof obj.at === 'string' && typeof obj.keyId === 'string') {
          all.push(obj);
        } else {
          malformed++;
        }
      } catch {
        malformed++;
      }
    }
  }
  all.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const sliced = limit > 0 ? all.slice(-limit) : all;
  // 返回时按时间倒序（最新在前），与旧接口一致
  sliced.reverse();
  return { ops: sliced, malformed, files };
}

/** 清理：删除 30 天前的 key-ops jsonl（只删自己 instanceId 前缀的，避免误删他实例）。 */
export function cleanupOldKeyOps(maxAgeDays = 30): number {
  const dir = storeDir();
  if (!existsSync(dir)) return 0;
  let names: string[] = [];
  try { names = readdirSync(dir); } catch { return 0; }
  let removed = 0;
  const cutoff = Date.now() - maxAgeDays * 86400_000;
  for (const name of names) {
    if (!name.startsWith('_key-ops-') || !name.endsWith('.jsonl')) continue;
    // 只清理本实例的旧文件；他实例的文件由他实例自己清理
    if (!name.includes(INSTANCE_ID)) continue;
    const p = join(dir, name);
    try {
      const st = statSync(p);
      if (st.mtimeMs < cutoff) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('node:fs').unlinkSync(p);
        removed++;
      }
    } catch { /* ignore */ }
  }
  return removed;
}
