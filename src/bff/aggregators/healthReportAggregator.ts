/**
 * 健澜科技数智医院智能体 - 详细健康报告聚合器（错误率 / 慢查询 / 学习闭环健康度）
 *
 * 分层：
 *  - buildHealthReport(errors, slowQueries, feedbackRate)：纯函数。
 *    输入采集层已折算好的三类信号，输出统一健康报告，无 IO、不读时钟，可直接单测。
 *  - 进程内采集：模块内存计数器（零新依赖）。由 server/中间件在请求收尾、
 *    慢查询发生、学习反馈回流时调用 record*()，collectDetailedHealth() 读数并汇总。
 *
 * 降级口径（degraded，可经常量覆盖）：
 *  - 错误率（百分比）> ERROR_RATE_DEGRADED_PCT（5%），或
 *  - 慢查询条数 > SLOW_QUERY_DEGRADED_COUNT（10 条）；
 *  任一命中即 status='degraded'。学习闭环健康度仅作信息展示，不参与降级判定。
 *
 * 隐私：只汇总计数与比率，绝不留存 SQL 文本、请求参数、患者数据或密钥；
 *       慢查询采集只记条数，不记语句内容。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 阈值与类型                                                          */
/* ------------------------------------------------------------------ */

/** 错误率（百分比）超过此值 → degraded */
export const ERROR_RATE_DEGRADED_PCT = 5;
/** 慢查询条数超过此值 → degraded */
export const SLOW_QUERY_DEGRADED_COUNT = 10;
/** 学习闭环反馈率（0–1 小数）低于此值 → warning */
export const LEARNING_WARNING_RATE = 0.3;

/** 学习闭环健康度：unknown 表示尚无反馈样本（新部署/零数据兜底） */
export type LearningHealth = 'healthy' | 'warning' | 'unknown';
/** 报告总体状态：任一降级规则命中即为 degraded */
export type HealthStatus = 'healthy' | 'degraded';

/** 详细健康报告（仅含计数与比率，不含任何原始报文/患者数据/密钥） */
export interface HealthReport {
  /** 总体状态：degraded 当且仅当触发任一降级规则 */
  status: HealthStatus;
  /** 错误率（百分比，0–100，保留两位小数） */
  errorRate: number;
  /** 慢查询条数 */
  slowQueryCount: number;
  /** 学习闭环健康度（由反馈率推导，不参与降级判定） */
  learningHealth: LearningHealth;
  /** 是否降级：错误率 >5% 或慢查询 >10 条 */
  degraded: boolean;
}

/* ------------------------------------------------------------------ */
/* 纯函数：三类信号 → 健康报告                                         */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：汇总错误率 / 慢查询 / 学习闭环反馈率 → 详细健康报告。
 *
 * @param errors        窗口内错误率（百分比，0–100）。由采集层以
 *                      errorRequestCount / totalRequestCount * 100 折算后传入；
 *                      非法值（NaN/负数）按 0 兜底。
 * @param slowQueries   慢查询记录数组（取 length）或直接传入条数；负数/非法按 0。
 * @param feedbackRate  学习闭环反馈率（0–1 小数，如 0.85 = 85%）。
 *                      <=0 或非法值视为「尚无反馈样本」→ unknown。
 * @returns             统一健康报告；错误率 >5% 或慢查询 >10 条时自动 degraded。
 *
 * @example
 * buildHealthReport(2.4, 3, 0.8);   // { status:'healthy', ... degraded:false }
 * buildHealthReport(6.1, 12, 0.2);  // { status:'degraded', ... degraded:true }
 */
export function buildHealthReport(
  errors: number,
  slowQueries: ReadonlyArray<unknown> | number,
  feedbackRate: number,
): HealthReport {
  /* 错误率：归一化到 [0,100]，两位小数 */
  const safeErrors = Number.isFinite(errors) ? errors : 0;
  const errorRate =
    Math.round(Math.min(100, Math.max(0, safeErrors)) * 100) / 100;

  /* 慢查询条数：兼容数组（取长度）或数值 */
  const rawSlow =
    typeof slowQueries === 'number'
      ? slowQueries
      : Array.isArray(slowQueries)
        ? slowQueries.length
        : 0;
  const slowQueryCount = Math.max(0, Math.floor(rawSlow));

  /* 学习闭环健康度：仅作信息展示，不触发降级 */
  let learningHealth: LearningHealth;
  if (!Number.isFinite(feedbackRate) || feedbackRate <= 0) {
    learningHealth = 'unknown'; // 尚无反馈样本（新部署/空数据兜底）
  } else if (feedbackRate < LEARNING_WARNING_RATE) {
    learningHealth = 'warning'; // 反馈率偏低
  } else {
    learningHealth = 'healthy';
  }

  /* 降级规则：错误率 >5% 或慢查询 >10 条（严格大于，边界值不触发） */
  const degraded =
    errorRate > ERROR_RATE_DEGRADED_PCT ||
    slowQueryCount > SLOW_QUERY_DEGRADED_COUNT;

  return {
    status: degraded ? 'degraded' : 'healthy',
    errorRate,
    slowQueryCount,
    learningHealth,
    degraded,
  };
}

/* ------------------------------------------------------------------ */
/* 进程内采集（模块内存计数器，零新依赖）                               */
/* ------------------------------------------------------------------ */

let totalRequestCount = 0;
let errorRequestCount = 0;
let slowQueryCount = 0;
let latestFeedbackRate = 0;

/**
 * 由请求收尾中间件调用：累计一个 HTTP 请求；isError=true 同时计一次错误。
 * 只计数，不记录请求体/患者数据。
 */
export function recordHealthHttpRequest(isError: boolean): void {
  totalRequestCount += 1;
  if (isError) errorRequestCount += 1;
}

/** 由慢查询日志调用：慢查询计数 +1。只记条数，绝不保存 SQL 文本或绑定参数。 */
export function recordSlowQuery(): void {
  slowQueryCount += 1;
}

/** 由学习反馈回流（如采纳率/反馈率计算任务）调用：更新最新学习反馈率（0–1）。 */
export function setLearningFeedbackRate(rate: number): void {
  latestFeedbackRate = rate;
}

/**
 * 读取进程内计数并汇总为健康报告（路由 handler 入口）。
 * 纯内存读取、无 IO；空部署（零请求/零慢查询/零反馈）时兜底为 healthy。
 */
export function collectDetailedHealth(): HealthReport {
  const errorRatePct =
    totalRequestCount > 0 ? (errorRequestCount / totalRequestCount) * 100 : 0;
  return buildHealthReport(errorRatePct, slowQueryCount, latestFeedbackRate);
}
