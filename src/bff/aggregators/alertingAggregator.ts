/**
 * 健澜科技 jlmedaios - 监控告警聚合器（M136-D）
 *
 * 分层（持续优化）：
 *  - 纯函数 triggerAlert / checkAlertThresholds：不读 IO、不改写入参，可直接单测；
 *    triggerAlert 仅在工厂内 mint 身份与时间戳，无任何模块级副作用。
 *  - 解耦通知：setAlertNotifier / notifyAlert 通过注入的 sink 投递告警，
 *    默认空实现；本模块不触碰 WebSocket（严禁项），由上层按需接线。
 *
 * 告警规则（阈值可由 config 覆盖，默认值见 DEFAULT_ALERT_THRESHOLDS）：
 *  - API 错误率 > 2%        → red（红）
 *  - P95 延迟 > 500ms       → yellow（黄）
 *  - 磁盘使用率 > 80%       → yellow（黄）
 *  - 内存使用率 > 85%       → red（红）
 *
 * 口径约定（持续优化）：
 *  - 比率类指标（apiErrorRate / diskUsedRatio / memoryUsedRatio）统一为 0..1 小数，
 *    例如 2% 写作 0.02；延迟类 p95LatencyMs 单位为毫秒；
 *  - 触发为严格大于阈值（>），等于阈值不触发，避免边界抖动反复告警；
 *  - 任一指标非有限数（NaN / Infinity / undefined）时该规则跳过，绝不误报。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 告警级别：red 紧急 / yellow 预警 */
export type AlertLevel = 'red' | 'yellow';

/** 告警来源维度（与规则一一对应） */
export type AlertSource =
  | 'api-error-rate'
  | 'p95-latency'
  | 'disk'
  | 'memory'
  | 'custom';

/** 待判定的运行指标快照（比率均为 0..1，延迟为毫秒） */
export interface AlertMetrics {
  /** API 错误率（0..1），如 0.02 = 2% */
  apiErrorRate: number;
  /** P95 接口延迟（毫秒） */
  p95LatencyMs: number;
  /** 磁盘使用率（0..1） */
  diskUsedRatio: number;
  /** 内存使用率（0..1） */
  memoryUsedRatio: number;
}

/** 阈值配置（未传字段回退到默认值） */
export interface AlertThresholdConfig {
  /** 错误率红线（默认 0.02 = 2%），超过即 red */
  errorRateRed: number;
  /** P95 黄线毫秒（默认 500），超过即 yellow */
  p95YellowMs: number;
  /** 磁盘黄线（默认 0.80 = 80%），超过即 yellow */
  diskYellowRatio: number;
  /** 内存红线（默认 0.85 = 85%），超过即 red */
  memoryRedRatio: number;
}

/** 一条告警（与前端告警中心列表项对齐） */
export interface Alert {
  /** 稳定唯一 id（工厂 mint，前端按 id 去重） */
  id: string;
  level: AlertLevel;
  source: AlertSource;
  /** 人类可读的告警描述 */
  message: string;
  /** 触发时的实际观测值 */
  value: number;
  /** 触发阈值 */
  threshold: number;
  /** 附加上下文（路由、实例、traceId 等，不含 PII） */
  metadata: Record<string, unknown>;
  /** 触发时间（ISO 8601） */
  triggeredAt: string;
  /** 是否已签收 */
  acknowledged: boolean;
}

/** 通知投递器（由上层注入；默认无投递） */
export type AlertNotifier = (alert: Alert) => void;

/* ------------------------------------------------------------------ */
/* 默认阈值与工具                                                      */
/* ------------------------------------------------------------------ */

/** 默认阈值：API错误率>2%红、P95>500ms黄、磁盘>80%黄、内存>85%红（持续优化） */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdConfig = {
  errorRateRed: 0.02,
  p95YellowMs: 500,
  diskYellowRatio: 0.8,
  memoryRedRatio: 0.85,
};

/** 仅保留有限数，非有限返回 null（防御 NaN/Infinity/undefined） */
function finiteOrNull(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** 把 0..1 比率格式化为百分比字符串（保留 2 位小数） */
function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：工厂构造一条告警。
 * 不从入参读取时钟、不修改入参、不触碰模块状态；仅在工厂内 mint id 与时间戳。
 * metadata 中可携带 source / value / threshold，其余字段原样挂到告警上下文。
 *
 * @param level    告警级别 red | yellow
 * @param message  告警描述
 * @param metadata 附加上下文（可含 source/value/threshold）
 */
export function triggerAlert(
  level: AlertLevel,
  message: string,
  metadata: Record<string, unknown> = {},
): Alert {
  const { source, value, threshold, ...rest } = metadata as {
    source?: AlertSource;
    value?: number;
    threshold?: number;
  } & Record<string, unknown>;

  return {
    id: `ALT_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    level,
    source: source ?? 'custom',
    message,
    value: typeof value === 'number' ? value : Number.NaN,
    threshold: typeof threshold === 'number' ? threshold : Number.NaN,
    metadata: rest,
    triggeredAt: new Date().toISOString(),
    acknowledged: false,
  };
}

/**
 * 纯函数：对一组运行指标跑阈值规则，返回全部被触发的告警（按 red 优先排序）。
 * 规则：错误率>红线→red；P95>黄线→yellow；磁盘>黄线→yellow；内存>红线→red。
 * 任一指标非有限数则跳过该规则；阈值非法（非有限）同样跳过。
 *
 * @param metrics 运行指标快照
 * @param config  阈值配置（缺省回退 DEFAULT_ALERT_THRESHOLDS）
 */
export function checkAlertThresholds(
  metrics: Partial<AlertMetrics> | null | undefined,
  config: Partial<AlertThresholdConfig> = {},
): Alert[] {
  const m = metrics ?? {};
  const cfg: AlertThresholdConfig = { ...DEFAULT_ALERT_THRESHOLDS, ...config };
  const alerts: Alert[] = [];

  /* API 错误率红线 → red */
  const err = finiteOrNull(m.apiErrorRate);
  const errThr = finiteOrNull(cfg.errorRateRed);
  if (err !== null && errThr !== null && err > errThr) {
    alerts.push(
      triggerAlert('red', `API 错误率 ${pct(err)} 超过红线 ${pct(errThr)}`, {
        source: 'api-error-rate',
        value: err,
        threshold: errThr,
      }),
    );
  }

  /* P95 延迟黄线 → yellow */
  const p95 = finiteOrNull(m.p95LatencyMs);
  const p95Thr = finiteOrNull(cfg.p95YellowMs);
  if (p95 !== null && p95Thr !== null && p95 > p95Thr) {
    alerts.push(
      triggerAlert('yellow', `P95 接口延迟 ${Math.round(p95)}ms 超过黄线 ${p95Thr}ms`, {
        source: 'p95-latency',
        value: p95,
        threshold: p95Thr,
      }),
    );
  }

  /* 磁盘使用率黄线 → yellow */
  const disk = finiteOrNull(m.diskUsedRatio);
  const diskThr = finiteOrNull(cfg.diskYellowRatio);
  if (disk !== null && diskThr !== null && disk > diskThr) {
    alerts.push(
      triggerAlert('yellow', `磁盘使用率 ${pct(disk)} 超过黄线 ${pct(diskThr)}`, {
        source: 'disk',
        value: disk,
        threshold: diskThr,
      }),
    );
  }

  /* 内存使用率红线 → red */
  const mem = finiteOrNull(m.memoryUsedRatio);
  const memThr = finiteOrNull(cfg.memoryRedRatio);
  if (mem !== null && memThr !== null && mem > memThr) {
    alerts.push(
      triggerAlert('red', `内存使用率 ${pct(mem)} 超过红线 ${pct(memThr)}`, {
        source: 'memory',
        value: mem,
        threshold: memThr,
      }),
    );
  }

  /* red 优先、同级按触发时间倒序（越新越靠前） */
  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'red' ? -1 : 1;
    return a.triggeredAt < b.triggeredAt ? 1 : -1;
  });
}

/* ------------------------------------------------------------------ */
/* 解耦通知（不触碰 WebSocket；由上层按需注入 sink）                    */
/* ------------------------------------------------------------------ */

let notifier: AlertNotifier | null = null;

/** 注入告警通知投递器（传 null 清空）。持续优化：后续可扩展邮件/短信/钉钉通道。 */
export function setAlertNotifier(fn: AlertNotifier | null): void {
  notifier = fn;
}

/**
 * 投递一条告警到已注册的通知通道。
 * 未注册投递器返回 false；投递异常被吞掉，绝不影响主流程。
 * @returns 是否成功投递到 sink
 */
export function notifyAlert(alert: Alert): boolean {
  if (!notifier) return false;
  try {
    notifier(alert);
    return true;
  } catch {
    return false;
  }
}
