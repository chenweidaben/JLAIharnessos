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
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
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
// 注意：Math.random().toString(36) 在极罕见情况下可能短于 6 字符（甚至空串），
// 会导致文件名出现连续 "--"，清理正则永远匹配不到、文件永久滞留。
// 这里兜底到固定长度，保证文件名稳定可解析。
function randomSuffix(): string {
  const s = Math.random().toString(36).slice(2, 8);
  return s.length >= 6 ? s : (s + '000000').slice(0, 6);
}
const INSTANCE_ID = `${hostname().replace(/[^a-zA-Z0-9]/g, '')}-${process.pid}-${randomSuffix()}`;

function storeDir(): string {
  return process.env.WORM_STORE_DIR ?? 'logs/worm-store';
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

/**
 * 解析留存天数：默认 180；可由 KEY_OPS_RETENTION_DAYS 覆盖。
 * 非法值（非数字、<=0、<180）直接抛错，不允许静默取默认——审计留存是合规硬指标。
 */
export function resolveRetentionDays(envValue: string | undefined = process.env.KEY_OPS_RETENTION_DAYS): number {
  const DEFAULT = 180;
  if (envValue === undefined || envValue === '') return DEFAULT;
  const n = Number(envValue);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`KEY_OPS_RETENTION_DAYS=${envValue} 非法：必须是正整数`);
  }
  if (n < 180) {
    throw new Error(`KEY_OPS_RETENTION_DAYS=${envValue} 低于合规下限 180 天（网络日志留存 6 个月），拒绝执行清理`);
  }
  return Math.floor(n);
}

/**
 * 从文件名 _key-ops-<instanceId>-<YYYYMMDD>.jsonl 提取 YYYYMMDD。
 * 解析失败返回 NaN（调用方视为不可识别文件，不删）。
 */
const KEY_OPS_NAME_RE = /^_key-ops-[^-]+-\d+-[a-z0-9]+-(\d{8})\.jsonl$/;
function extractDateFromName(name: string): number {
  const m = KEY_OPS_NAME_RE.exec(name);
  if (!m) return NaN;
  const ymd = m[1];
  const y = Number(ymd.slice(0, 4));
  const mo = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  return Date.UTC(y, mo - 1, d);
}

export interface CleanupResult {
  removed: number;
  files: string[];
  retentionDays: number;
  cutoffIso: string;
}

/**
 * 跨实例清理：按文件名里的 YYYYMMDD 判断新旧，删除所有实例（含已退出进程）的旧文件。
 *
 * 历史问题：旧实现只删"文件名含本 instanceId"的文件，而 instanceId 含 pid+随机串，
 * 进程重启后新实例拿不到旧实例的 id，旧文件永远无人清理。
 * 现在改为按文件名日期判定，不依赖 instanceId，任何一次运维脚本执行都能清理所有实例的旧文件。
 *
 * 默认 dryRun=true：只返回清单，不真删。审计文件删除不可逆，必须显式 apply。
 */
export function cleanupOldKeyOps(opts: { dryRun?: boolean; retentionDays?: number } = {}): CleanupResult {
  const retentionDays = opts.retentionDays ?? resolveRetentionDays();
  const dryRun = opts.dryRun ?? true;
  const dir = storeDir();
  const cutoffMs = Date.now() - retentionDays * 86400_000;
  const result: CleanupResult = {
    removed: 0,
    files: [],
    retentionDays,
    cutoffIso: new Date(cutoffMs).toISOString(),
  };
  if (!existsSync(dir)) return result;
  let names: string[] = [];
  try { names = readdirSync(dir); } catch { return result; }
  for (const name of names) {
    if (!name.startsWith('_key-ops-') || !name.endsWith('.jsonl')) continue;
    const fileDateMs = extractDateFromName(name);
    if (Number.isNaN(fileDateMs)) continue; // 不可识别的命名，不删
    if (fileDateMs >= cutoffMs) continue;    // 未超期
    const p = join(dir, name);
    result.files.push(p);
    if (dryRun) continue;
    try {
      unlinkSync(p);
      result.removed++;
    } catch (e) {
      console.warn('[worm-key-ops] 清理旧文件失败:', name, (e as Error).message);
    }
  }
  return result;
}
