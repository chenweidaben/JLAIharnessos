/**
 * 健澜科技 jlmedaios - M132-C 系统日志聚合器（产品化收尾）
 *
 * 分层（纯函数层，不触库、不发网络，便于单测与复用）：
 *  - logSystem(level, module, message, metadata, opts?)：
 *      把一次运行事件塑形为 LogEntry；level 归一、message 截断、
 *      metadata 冻结为可序列化对象；now / id 可注入便于单测。
 *  - queryLogs(logs, filters, page, pageSize)：
 *      内存级筛选 + 分页；按级别 / 模块 / 关键字 / 时间窗过滤，
 *      结果按时间倒序，返回 PaginatedLogs。
 *
 * 生产安全加固：
 *  - level 仅允许 debug / info / warn / error，非法值兜底为 info；
 *  - message 落库前截断（防超长垃圾数据撑爆日志表）；
 *  - metadata 只保留可 JSON 序列化的标量 / 嵌套对象，杜绝函数 / Symbol / 循环引用；
 *  - 纯函数层不读时钟副作用以外的任何外部状态；now / id 均可注入。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 日志级别（产品化收尾：四档，与 medmuse.system_log.chk_system_log_level 对齐） */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 合法级别集合（用于归一与校验） */
const VALID_LEVELS: ReadonlySet<LogLevel> = new Set(['debug', 'info', 'warn', 'error']);

/** 一条系统日志（与 medmuse.system_log 行对齐） */
export interface LogEntry {
  /** 主键；纯函数层未触库时分配临时 id，落库后由数据库回填真实 id */
  id: number;
  /** 日志级别 */
  level: LogLevel;
  /** 模块名（auth / scheduler / billing / gateway / admin ...） */
  module: string;
  /** 人读摘要 */
  message: string;
  /** 结构化上下文（员工工号、路由、耗时、业务单号等） */
  metadata: Record<string, unknown>;
  /** 触发日志的员工工号（系统自动事件为空串；可由 staffId 注入 opts） */
  staffId: string;
  /** 日志时间（ISO 8601） */
  createdAt: string;
}

/** 日志查询过滤条件（全部可选；缺省返回全量，按时间倒序） */
export interface SystemLogFilter {
  /** 级别精确匹配 */
  level?: LogLevel;
  /** 模块名包含匹配（大小写不敏感） */
  module?: string;
  /** message 关键字包含匹配（大小写不敏感） */
  keyword?: string;
  /** 起始时间（ISO，闭区间） */
  startTime?: string;
  /** 结束时间（ISO，闭区间） */
  endTime?: string;
}

/** 分页结果 */
export interface PaginatedLogs {
  /** 过滤后总条数 */
  total: number;
  /** 当前页（1-based） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 当前页数据（按时间倒序） */
  items: LogEntry[];
}

/** logSystem 可选注入项（便于单测与落库回填） */
export interface LogSystemOptions {
  /** 注入 id；未触库时由模块级临时计数器分配 */
  id?: number;
  /** 注入当前时间 ISO；缺省取 new Date().toISOString() */
  now?: string;
  /** 触发员工工号（写入 staff_id） */
  staffId?: string;
}

/* ------------------------------------------------------------------ */
/* 生产安全加固：长度截断阈值                                            */
/* ------------------------------------------------------------------ */

/** message 最大长度（摘要用途，超长截断） */
const MAX_MESSAGE_LEN = 500;

/** 临时 id 计数器（纯函数层未触库时使用；模块级单调递增，保证同次进程内唯一） */
let tempIdSeq = 1;

/* ------------------------------------------------------------------ */
/* 纯函数实现                                                          */
/* ------------------------------------------------------------------ */

/**
 * 归一化日志级别：仅接受 debug / info / warn / error，
 * 非法值（含大小写不一致、空串）兜底为 info，保证 CHECK 约束不被违反。
 */
export function normalizeLevel(level: unknown): LogLevel {
  const s = String(level ?? '').trim().toLowerCase();
  if ((VALID_LEVELS as ReadonlySet<string>).has(s)) return s as LogLevel;
  return 'info';
}

/**
 * 安全序列化 metadata：剔除 undefined / 函数 / Symbol，循环引用兜底为 '[Circular]'。
 * 只保留可 JSON 化的数据，杜绝把 React 事件、DB 句柄等不可序列化对象落库。
 */
export function sanitizeMetadata(input: unknown): Record<string, unknown> {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input === undefined ? {} : { value: input };
  }
  if (Array.isArray(input)) {
    return { items: input.slice(0, 64).map((v) => (typeof v === 'object' ? '[Object]' : v)) };
  }
  const seen = new WeakSet<object>();
  const walk = (val: unknown, depth: number): unknown => {
    if (depth > 4) return '[Object]';
    if (val === null || typeof val !== 'object') return val;
    if (val instanceof Error) return `${val.name}: ${val.message}`;
    if (typeof (val as { toISOString?: unknown }).toISOString === 'function') {
      return (val as Date).toISOString();
    }
    if (seen.has(val as object)) return '[Circular]';
    seen.add(val as object);
    if (Array.isArray(val)) return val.slice(0, 64).map((v) => walk(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (typeof v === 'function' || typeof v === 'symbol') continue;
      out[k] = walk(v, depth + 1);
    }
    return out;
  };
  return walk(input, 0) as Record<string, unknown>;
}

/**
 * logSystem：把一次运行事件塑形为 LogEntry（纯函数，无 DB 副作用）。
 *
 * - level 归一化（非法兜底 info）；
 * - module / message trim，message 超长截断到 MAX_MESSAGE_LEN；
 * - metadata 经 sanitizeMetadata 安全序列化；
 * - createdAt 取 opts.now 或当前时刻；id 取 opts.id 或模块级临时计数。
 */
export function logSystem(
  level: unknown,
  moduleName: string,
  message: string,
  metadata?: unknown,
  opts?: LogSystemOptions,
): LogEntry {
  const safeMessage = String(message ?? '').trim();
  return {
    id: opts?.id ?? tempIdSeq++,
    level: normalizeLevel(level),
    module: String(moduleName ?? '').trim(),
    message:
      safeMessage.length > MAX_MESSAGE_LEN
        ? `${safeMessage.slice(0, MAX_MESSAGE_LEN - 1)}…`
        : safeMessage,
    metadata: sanitizeMetadata(metadata),
    staffId: String(opts?.staffId ?? '').trim(),
    createdAt: opts?.now ?? new Date().toISOString(),
  };
}

/** 大小写不敏感的包含匹配；关键字缺省时视为不限制 */
function matchContains(value: string, keyword?: string): boolean {
  const kw = (keyword ?? '').trim().toLowerCase();
  if (!kw) return true;
  return (value ?? '').toLowerCase().includes(kw);
}

/**
 * queryLogs：日志筛选 + 分页（纯函数）。
 *
 * 入参 logs 为已从 DB 拉取的近期窗口数组（路由层负责窗口）；
 * filters 可按 level 精确、module 包含、message 关键字、时间窗过滤；
 * 结果按 createdAt 倒序（时间相同按 id 倒序）后再分页。
 *
 * 边界安全：
 *  - logs 非数组 / filters 为空对象时返回空页；
 *  - page < 1 归一为 1；pageSize <= 0 归一为 20；pageSize 上限 200；
 *  - 越界页返回空 items，total 仍为过滤后总数。
 */
export function queryLogs(
  logs: LogEntry[],
  filters: SystemLogFilter,
  page: number,
  pageSize: number,
): PaginatedLogs {
  const list = Array.isArray(logs) ? logs : [];
  const f = filters ?? {};

  const filtered = list
    .filter((l) => {
      if (!l) return false;
      if (f.level && l.level !== f.level) return false;
      if (!matchContains(l.module, f.module)) return false;
      if (!matchContains(l.message, f.keyword)) return false;
      if (f.startTime && l.createdAt < f.startTime) return false;
      if (f.endTime && l.createdAt > f.endTime) return false;
      return true;
    })
    .sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id,
    );

  const total = filtered.length;
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : 20;
  const clampedSize = Math.min(safeSize, 200);
  const start = (safePage - 1) * clampedSize;
  const items = start >= total ? [] : filtered.slice(start, start + clampedSize);

  return { total, page: safePage, pageSize: clampedSize, items };
}
