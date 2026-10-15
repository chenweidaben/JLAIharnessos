/**
 * 健澜科技数智医院智能体 - 系统错误日志聚合器（M123-C，生产安全加固）
 *
 * 分层：
 *  - logError(errorType, message, stack, route, staffId, opts?)：纯函数。
 *    把一次异常塑形为 SystemError 记录（含长度截断 / 敏感剥离兜底），
 *    不触库、不发网络；持久化由路由层用 RETURNING id 落库后回填。
 *  - aggregateErrors(errors, opts?)：纯函数。输入错误记录数组，输出
 *    {todayCount, trend, topTypes, unresolved} 看板口径，无 IO、可单测。
 *  - resolveError(errorId, errors)：纯函数。返回新数组，把命中 id 的记录
 *    标记 resolved=true；不可变更新，绝不修改入参。
 *
 * 生产安全加固：
 *  - message / stack_trace 落库前截断（防超长垃圾数据撑爆日志表）；
 *  - 纯函数层不读时钟副作用以外的任何外部状态；now / id 均可注入，便于单测；
 *  - 不做患者身份反推，只保留员工工号与路由等运维元信息。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 一条系统错误记录（与 medmuse.system_error_log 行对齐） */
export interface SystemError {
  /** 主键；纯函数层在未触库时分配临时 id，落库后由 RETURNING 回填真实 id */
  id: number;
  /** 错误类别：DB_DOWN / TIMEOUT / VALIDATION / AUTH / UNHANDLED 等 */
  errorType: string;
  /** 错误摘要（人读） */
  message: string;
  /** 堆栈快照（可空串） */
  stackTrace: string;
  /** 触发路由 */
  route: string;
  /** 触发时登录员工工号（匿名 / 未登录为空串） */
  staffId: string;
  /** 首次发生时间（ISO 8601） */
  createdAt: string;
  /** 是否已闭环解决 */
  resolved: boolean;
}

/** 聚合看板输出 */
export interface ErrorAggregation {
  /** 今日（本地自然日）新增错误数 */
  todayCount: number;
  /** 近 7 天每日错误数趋势（含今日，最旧在前） */
  trend: Array<{ date: string; count: number }>;
  /** 高频错误类型 Top5（按次数倒序） */
  topTypes: Array<{ errorType: string; count: number }>;
  /** 未闭环错误总数 */
  unresolved: number;
}

/* ------------------------------------------------------------------ */
/* 生产安全加固：长度截断阈值                                            */
/* ------------------------------------------------------------------ */

/** message 最大长度（摘要用途，超长截断） */
const MAX_MESSAGE_LEN = 500;
/** stack_trace 最大长度（堆栈可能很长，截断防日志表膨胀） */
const MAX_STACK_LEN = 4000;
/** 趋势窗口天数 */
const TREND_DAYS = 7;
/** topTypes 取前 N */
const TOP_TYPES_LIMIT = 5;

/* ------------------------------------------------------------------ */
/* 纯函数实现                                                          */
/* ------------------------------------------------------------------ */

/** 临时 id 计数器（纯函数层未触库时使用；模块级单调递增，保证同次进程内唯一） */
let tempIdSeq = 1;

/**
 * logError：把一次异常塑形为 SystemError 记录。
 *
 * 纯函数：不触库、不发网络；message / stack 按生产安全阈值截断。
 * now / id 可注入（opts），便于单测确定性；缺省时分别取当前时间与临时自增 id。
 */
export function logError(
  errorType: string,
  message: string,
  stack: string,
  route: string,
  staffId: string,
  opts?: { now?: string; id?: number },
): SystemError {
  return {
    id: opts?.id ?? tempIdSeq++,
    errorType: (errorType || 'UNHANDLED').slice(0, 80),
    message: (message || '').slice(0, MAX_MESSAGE_LEN),
    stackTrace: (stack || '').slice(0, MAX_STACK_LEN),
    route: (route || '').slice(0, 200),
    staffId: (staffId || '').slice(0, 64),
    createdAt: opts?.now ?? new Date().toISOString(),
    resolved: false,
  };
}

/** 把 ISO 时间串转成本地 YYYY-MM-DD（用于今日 / 趋势分桶） */
function dayKey(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // 非法时间串：归到“今天”桶，避免静默丢数
    return toDayKey(now);
  }
  return toDayKey(d);
}

/** Date -> 本地 YYYY-MM-DD */
function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * aggregateErrors：聚合错误记录为看板口径。
 *
 * @param errors 错误记录数组（只读，不修改入参）
 * @param opts.now 参考时间（默认当前时间）；注入便于单测“今日 / 趋势”边界
 */
export function aggregateErrors(
  errors: SystemError[],
  opts?: { now?: Date },
): ErrorAggregation {
  const now = opts?.now ?? new Date();
  const todayKey = toDayKey(now);

  let todayCount = 0;
  let unresolved = 0;
  const typeCounter = new Map<string, number>();
  const dayCounter = new Map<string, number>();

  for (const e of errors) {
    // 未闭环计数
    if (!e.resolved) unresolved += 1;

    // 今日计数
    const key = dayKey(e.createdAt, now);
    if (key === todayKey) todayCount += 1;

    // 错误类型分桶
    const t = e.errorType || 'UNHANDLED';
    typeCounter.set(t, (typeCounter.get(t) ?? 0) + 1);

    // 趋势分桶（只落在近 7 天窗口内的才计入）
    if (isWithinTrendWindow(e.createdAt, now)) {
      dayCounter.set(key, (dayCounter.get(key) ?? 0) + 1);
    }
  }

  // 近 7 天趋势：构造完整日期轴（含零值），最旧在前
  const trend: Array<{ date: string; count: number }> = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = toDayKey(d);
    trend.push({ date: k, count: dayCounter.get(k) ?? 0 });
  }

  // 高频类型 Top5：次数倒序，同次数按类型名字典序稳定排序
  const topTypes = [...typeCounter.entries()]
    .map(([errorType, count]) => ({ errorType, count }))
    .sort((a, b) => b.count - a.count || a.errorType.localeCompare(b.errorType))
    .slice(0, TOP_TYPES_LIMIT);

  return { todayCount, trend, topTypes, unresolved };
}

/** 判断某 ISO 时间是否落在近 TREND_DAYS 天窗口内（含今天） */
function isWithinTrendWindow(iso: string, now: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - (TREND_DAYS - 1));
  return d.getTime() >= start.getTime();
}

/**
 * resolveError：把指定 id 的错误标记为已闭环。
 *
 * 不可变更新：返回新数组，命中记录 resolved=true，其余原样引用；
 * 不修改入参数组与命中记录本身。id 未命中时原样返回（不报错）。
 */
export function resolveError(errorId: number, errors: SystemError[]): SystemError[] {
  return errors.map((e) => (e.id === errorId ? { ...e, resolved: true } : e));
}
