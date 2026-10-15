/**
 * 健澜科技 jlmedaios - M149-D 错误处理与日志完善聚合器（生产质量门禁）
 *
 * 本模块把「错误响应下发」与「错误日志留痕」从路由中抽离为纯函数，
 * 解决线上只有一句「500 错误」、排查无据的问题。三条纯函数职责：
 *
 *  1. formatErrorResponse(error, env): ErrorResponse
 *     - production：{ error: { code, message } } —— 不下发堆栈 / SQL / 物理路径 / 内网地址；
 *     - development：{ error: { code, message, stack } } —— 附堆栈，便于本地联调定位。
 *
 *  2. logError(error, context): LogEntry
 *     - 把任意异常归一为结构化日志行：
 *       timestamp / level / code / message / path / staffId / patientId；
 *     - 同时落入进程内环形缓冲（默认保留最近 500 条，重启即清空），
 *       供 getErrorStats 聚合。不写 DB、不打 console、不发网络 —— 纯函数无副作用。
 *
 *  3. getErrorStats(period): ErrorStats
 *     - 按时间窗（默认近 60 分钟）聚合缓冲内日志：
 *       总量 / 分级计数 / 高频错误码 / 高频路径 / 近期明细 Top50。
 *
 * 生产质量门禁：
 *  - 生产环境 5xx 一律兜底文案「系统繁忙，请稍后重试」，绝不下发堆栈；
 *  - 4xx（400/401/403/404/409/429）保持明确语义，便于前端引导；
 *  - message 统一过堆栈帧 / 物理路径 / SQL / 内网 IP 剥离，杜绝调试残留外泄；
 *  - 本模块不发起 HTTP、不连数据库、不读环境变量；env 与时间均由调用方注入，
 *    单测可正反两用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 日志级别 */
export type ErrorLevel = 'error' | 'warn' | 'info';

/** 运行环境：production 不下发堆栈，development 下发堆栈 */
export type AppEnv = 'production' | 'development';

/**
 * 对客户端下发的错误响应体。
 * production 仅含 code/message；development 额外携带 stack。
 */
export interface ErrorResponse {
  error: {
    /** 业务错误码（与 types.ts ErrorCode 对齐） */
    code: number;
    /** 对客户端可见、已脱敏的安全文案 */
    message: string;
    /** 仅 development 存在：原始堆栈，供联调定位 */
    stack?: string;
  };
}

/** logError 的上下文：调用方把请求侧信息注入日志行 */
export interface LogContext {
  /** 触发错误的路由路径，如 /api/v1/admin/errors/stats */
  path?: string;
  /** 当前操作员工 ID（未登录为空串） */
  staffId?: string;
  /** 关联患者 ID（无关联为空串） */
  patientId?: string;
  /** 日志级别，默认 'error' */
  level?: ErrorLevel;
  /** 时间戳覆盖（ISO 字符串）。正常链路由 logError 自动取当前时间；
   *  仅在日志回放 / 单测中由调用方注入，保证统计可重复 */
  timestamp?: string;
}

/** 结构化日志行 —— 固定七字段，一行不多一行不少 */
export interface LogEntry {
  /** ISO 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: ErrorLevel;
  /** 业务错误码 */
  code: number;
  /** 已脱敏的错误摘要 */
  message: string;
  /** 触发路径 */
  path: string;
  /** 员工 ID */
  staffId: string;
  /** 患者 ID */
  patientId: string;
  /** 原始堆栈（仅留在服务端缓冲，随 admin 明细返回，不下发客户端） */
  stack?: string;
}

/** 错误码聚合桶 */
export interface CodeBucket {
  code: number;
  count: number;
}

/** 路径聚合桶 */
export interface PathBucket {
  path: string;
  count: number;
}

/** getErrorStats 的入参：时间窗 */
export interface StatsPeriod {
  /** 统计窗口长度（分钟），默认 60；上限 1440（24h） */
  minutes?: number;
  /** 窗末时刻注入（默认当前时间）；单测注入固定时间保证可重复 */
  now?: Date;
}

/** 错误统计聚合结果 */
export interface ErrorStats {
  period: {
    /** 窗起点 ISO */
    from: string;
    /** 窗终点 ISO */
    to: string;
    /** 窗口长度（分钟） */
    minutes: number;
  };
  /** 窗口内日志总数 */
  total: number;
  /** 分级计数 */
  byLevel: Record<ErrorLevel, number>;
  /** 高频错误码 Top10（降序） */
  byCode: CodeBucket[];
  /** 高频路径 Top10（降序） */
  byPath: PathBucket[];
  /** 近期明细 Top50（时间倒序） */
  recent: LogEntry[];
}

/* ============================== 常量与内存缓冲 ============================== */

/** 生产环境 5xx 统一兜底文案 */
export const PROD_FALLBACK_MESSAGE = '系统繁忙，请稍后重试';

/** 环形缓冲容量：超出后丢弃最旧记录，防止内存无限增长 */
const BUFFER_CAPACITY = 500;

/** 进程内日志环形缓冲（模块级状态；无 SQL 迁移约束，重启即清空） */
let buffer: LogEntry[] = [];

/**
 * 仅用于单测隔离：清空环形缓冲。
 * 生产路由不得调用。
 */
export function __resetErrorLogBuffer(): void {
  buffer = [];
}

/* ============================== 内部工具 ============================== */

/** 从任意异常载体提取归一化三元组 */
function normalizeRaw(err: unknown): { code: number; message: string; stack?: string } {
  if (err == null) {
    return { code: 50000, message: 'Unknown error' };
  }
  if (err instanceof Error) {
    const e = err as Error & { code?: number };
    return {
      code: typeof e.code === 'number' ? e.code : 50000,
      message: err.message || err.name || 'Error',
      stack: typeof err.stack === 'string' ? err.stack : undefined,
    };
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    return {
      code: typeof o.code === 'number' ? o.code : 50000,
      message: typeof o.message === 'string' ? o.message : JSON.stringify(o),
      stack: typeof o.stack === 'string' ? o.stack : undefined,
    };
  }
  return { code: 50000, message: String(err) };
}

/**
 * 剥离文本中的内部细节：堆栈帧、物理路径、SQL 片段、内网主机 / IP。
 * 与 errorSanitizerAggregator 同一纪律，但自包含实现，避免循环依赖。
 */
function stripInternalDetail(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  let out = text;
  // 堆栈帧：at queryFn (C:\app\db.ts:44:11) / at Object.<anonymous> (/app/src/x.ts:1:1)
  out = out.replace(/at\s+\S+\s*\([^)]*\)/g, '[stack]');
  out = out.replace(/\bat\s+\S+/g, '[stack]');
  // 物理路径：Windows C:\... 与 Unix 常见绝对路径
  out = out.replace(/[A-Za-z]:\\[^\s"'']+/g, '[path]');
  out = out.replace(/\/(?:usr|app|opt|home|var|etc|tmp)\/[^\s"'']+/g, '[path]');
  // SQL 片段
  out = out.replace(/\b(SELECT|INSERT|UPDATE|DELETE)\s+[^"'\n;]+/gi, '[sql]');
  // 内网 IP / 主机
  out = out.replace(
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    '[host]',
  );
  out = out.replace(/\b(?:localhost|db|postgres|redis|internal)[._-][\w.-]*/gi, '[host]');
  out = out.replace(/:\d{2,5}\b/g, ':[port]');
  return out.trim();
}

/** 4xx 兜底文案（原始 message 为空时） */
function clientFallbackMessage(code: number): string {
  if (code >= 40000 && code < 41000) return '请求参数有误';
  if (code >= 40100 && code < 40200) return '未登录或登录已过期';
  if (code >= 40300 && code < 40400) return '无权限执行该操作';
  if (code >= 40400 && code < 40500) return '资源不存在';
  if (code >= 40900 && code < 41000) return '资源冲突';
  if (code >= 42900 && code < 43000) return '请求过于频繁，请稍后再试';
  return '请求无法处理';
}

/* ============================== 纯函数 1：错误响应格式化 ============================== */

/**
 * 把任意异常归一为对客户端安全的响应体。
 *
 * - production：绝不下发 stack；5xx 统一兜底文案，4xx 保持明确语义但剥离内部细节；
 * - development：下发 stack，message 保留剥离后的可读错误，便于联调。
 *
 * @param err 任意异常（Error / 普通对象 / 字符串 / null）
 * @param env 运行环境，由调用方按 NODE_ENV 显式注入
 */
export function formatErrorResponse(err: unknown, env: AppEnv): ErrorResponse {
  const { code, message, stack } = normalizeRaw(err);
  const stripped = stripInternalDetail(message);

  if (env === 'production') {
    // 5xx 生产兜底（错误码按 5xxxx 判定，含 50000/50300 等）
    if (code >= 50000) {
      return { error: { code: 50000, message: PROD_FALLBACK_MESSAGE } };
    }
    // 4xx 保持明确，空 message 给语义化兜底
    return { error: { code, message: stripped || clientFallbackMessage(code) } };
  }

  // development：附堆栈，message 剥离后可读
  return {
    error: {
      code,
      message: stripped || message || 'Internal Server Error',
      ...(stack ? { stack } : {}),
    },
  };
}

/* ============================== 纯函数 2：错误日志记录 ============================== */

/**
 * 把任意异常归一为结构化日志行，并落入进程内环形缓冲。
 * 不打 console、不写 DB —— 缓冲仅供 getErrorStats / admin 监控端点读取。
 *
 * @param err 任意异常
 * @param context 请求侧上下文（路径 / 员工 / 患者 / 级别 / 可选时间覆盖）
 */
export function logError(err: unknown, context: LogContext = {}): LogEntry {
  const { code, message, stack } = normalizeRaw(err);
  const entry: LogEntry = {
    timestamp: context.timestamp ?? new Date().toISOString(),
    level: context.level ?? 'error',
    code,
    message: stripInternalDetail(message) || message || '(no error message)',
    path: context.path ?? '',
    staffId: context.staffId ?? '',
    patientId: context.patientId ?? '',
    ...(stack ? { stack } : {}),
  };

  // 环形缓冲：超容量丢弃最旧，保证进程内存有界（生产质量门禁）
  buffer.push(entry);
  if (buffer.length > BUFFER_CAPACITY) {
    buffer.splice(0, buffer.length - BUFFER_CAPACITY);
  }

  return entry;
}

/* ============================== 纯函数 3：错误统计聚合 ============================== */

/**
 * 按时间窗聚合缓冲内日志。
 *
 * @param period 时间窗；minutes 默认 60 分钟，now 默认当前时间（单测可注入固定时间）
 */
export function getErrorStats(period: StatsPeriod = {}): ErrorStats {
  const minutes =
    typeof period.minutes === 'number' && period.minutes > 0
      ? Math.min(Math.floor(period.minutes), 1440)
      : 60;
  const now = period.now instanceof Date && !Number.isNaN(period.now.getTime()) ? period.now : new Date();
  const fromMs = now.getTime() - minutes * 60 * 1000;
  const fromIso = new Date(fromMs).toISOString();
  const toIso = now.toISOString();

  // 窗口内日志：按时间倒序
  const inWindow = buffer
    .filter((e) => e.timestamp >= fromIso && e.timestamp <= toIso)
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // 分级计数
  const byLevel: Record<ErrorLevel, number> = { error: 0, warn: 0, info: 0 };
  for (const e of inWindow) byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;

  // 错误码聚合
  const codeMap = new Map<number, number>();
  for (const e of inWindow) codeMap.set(e.code, (codeMap.get(e.code) ?? 0) + 1);
  const byCode: CodeBucket[] = Array.from(codeMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 路径聚合（空路径归为 '(unknown path)'）
  const pathMap = new Map<string, number>();
  for (const e of inWindow) {
    const key = e.path || '(unknown path)';
    pathMap.set(key, (pathMap.get(key) ?? 0) + 1);
  }
  const byPath: PathBucket[] = Array.from(pathMap.entries())
    .map(([p, count]) => ({ path: p, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    period: { from: fromIso, to: toIso, minutes },
    total: inWindow.length,
    byLevel,
    byCode,
    byPath,
    recent: inWindow.slice(0, 50),
  };
}
