/**
 * 健澜科技数智医院智能体 - 系统智能度监控聚合器（M119-D）
 *
 * 依据宪法第七章（AI 原生医院 / MUSE 智能体治理）：对全院智能体的「智能度」
 * 做统一量化与告警，覆盖四条核心口径——
 *   - llmSuccessRate：大模型调用成功率（成功次数 / 总调用次数）；
 *   - recommendationAdoptionRate：建议采纳率（采纳 + 修改采纳*0.5 / 建议总条数）；
 *   - qaAccuracy：知识问答准确率（答对 / 问答总条数）；
 *   - coverageRate：智能体业务覆盖率（已覆盖场景数 / 应覆盖场景数）。
 *
 * 分层（与 systemHealthAggregator 同款）：
 *  - buildSystemIntelligenceDashboard(raw, thresholds?)：纯函数。输入采集端原始
 *    计数快照（含历史周期序列），输出四项指标现值、趋势序列与告警列表，无 IO、
 *    无时钟副作用（周期标签由调用方以字符串注入），可直接单测。
 *  - checkAlerts(raw, thresholds?)：纯函数。仅负责「指标跌破阈值 / 环比下降」两类
 *    告警判定并标红，供看板与独立巡检复用。
 *  - collectRaw() / recordXxx()：模块内内存采集（零新依赖）。计数器在进程内累加，
 *    趋势序列为滚动内存表；DEMO 或尚无样本时由路由层打 demo 标记，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型与阈值                                                          */
/* ------------------------------------------------------------------ */

/** 告警严重度：critical（严重，标红）/ warning（预警，标黄） */
export type AlertSeverity = 'critical' | 'warning';

/** 四条指标的稳定键名 */
export type MetricKey =
  | 'llmSuccessRate'
  | 'recommendationAdoptionRate'
  | 'qaAccuracy'
  | 'coverageRate';

/** 采集端原始计数快照（未折算比率）：纯函数仅消费本结构 */
export interface IntelligenceRawMetrics {
  /** 是否演示模式（尚无真实样本时由采集端置位） */
  demo: boolean;
  llm: {
    /** 大模型调用总次数 */
    total: number;
    /** 大模型调用成功次数 */
    success: number;
  };
  recommendations: {
    /** 建议总条数 */
    total: number;
    /** 被医生直接采纳 */
    adopted: number;
    /** 被医生修改后采纳（按半权计入正向） */
    modified: number;
  };
  qa: {
    /** 知识问答总条数 */
    total: number;
    /** 答对条数 */
    correct: number;
  };
  coverage: {
    /** 应覆盖场景数（分母） */
    total: number;
    /** 已覆盖场景数（分子） */
    covered: number;
  };
  /**
   * 历史周期序列（由旧到新），用于趋势线与「环比下降」判定。
   * 每项为一个已折算好的周期比率快照。
   */
  history: TrendPoint[];
}

/** 单个趋势周期点（四项比率，取值 [0,1]） */
export interface TrendPoint {
  /** 周期标签（如 '2026-W41' / '10-15'），由调用方注入 */
  period: string;
  llmSuccessRate: number;
  recommendationAdoptionRate: number;
  qaAccuracy: number;
  coverageRate: number;
}

/** 单条告警 */
export interface IntelligenceAlert {
  /** 关联指标键 */
  key: MetricKey;
  /** 指标中文名 */
  name: string;
  /** 当前值（0..1） */
  current: number;
  /** 触发口径的阈值（0..1） */
  threshold: number;
  severity: AlertSeverity;
  /** 告警文案 */
  message: string;
}

/** 告警阈值（均可注入覆盖） */
export interface IntelligenceThresholds {
  llmWarn: number;
  llmCrit: number;
  adoptionWarn: number;
  adoptionCrit: number;
  qaWarn: number;
  qaCrit: number;
  coverageWarn: number;
  coverageCrit: number;
  /** 环比下降 ≥ 此幅度（百分点绝对值）→ warning */
  dropWarnDelta: number;
  /** 环比下降 ≥ 此幅度 → critical */
  dropCritDelta: number;
}

export const DEFAULT_INTELLIGENCE_THRESHOLDS: IntelligenceThresholds = {
  llmWarn: 0.9,
  llmCrit: 0.8,
  adoptionWarn: 0.6,
  adoptionCrit: 0.45,
  qaWarn: 0.85,
  qaCrit: 0.7,
  coverageWarn: 0.7,
  coverageCrit: 0.5,
  dropWarnDelta: 0.05,
  dropCritDelta: 0.1,
};

/** 看板输出（四项现值 + 趋势 + 告警） */
export interface SystemIntelligenceDashboard {
  demo: boolean;
  generatedAt: string;
  llmSuccessRate: number;
  recommendationAdoptionRate: number;
  qaAccuracy: number;
  coverageRate: number;
  /** 样本量（前端用于提示可信度） */
  sampleSizes: {
    llmCalls: number;
    recommendations: number;
    qaSamples: number;
    coverageScenarios: number;
  };
  trends: TrendPoint[];
  alerts: IntelligenceAlert[];
}

/** 指标元数据：键 → 中文名与对应的绝对阈值 */
const METRIC_META: Array<{
  key: MetricKey;
  name: string;
  warn: (t: IntelligenceThresholds) => number;
  crit: (t: IntelligenceThresholds) => number;
}> = [
  {
    key: 'llmSuccessRate',
    name: '大模型成功率',
    warn: (t) => t.llmWarn,
    crit: (t) => t.llmCrit,
  },
  {
    key: 'recommendationAdoptionRate',
    name: '建议采纳率',
    warn: (t) => t.adoptionWarn,
    crit: (t) => t.adoptionCrit,
  },
  {
    key: 'qaAccuracy',
    name: '问答准确率',
    warn: (t) => t.qaWarn,
    crit: (t) => t.qaCrit,
  },
  {
    key: 'coverageRate',
    name: '业务覆盖率',
    warn: (t) => t.coverageWarn,
    crit: (t) => t.coverageCrit,
  },
];

/* ------------------------------------------------------------------ */
/* 纯函数：比率折算                                                     */
/* ------------------------------------------------------------------ */

/** 比率折算：分子/分母；分母 ≤ 0 时返回 0，结果 clamp 到 [0,1] 并保留 4 位小数 */
export function rateOf(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const r = Math.min(1, Math.max(0, numerator / denominator));
  return Math.round(r * 10000) / 10000;
}

/** 折算原始快照的四项现值比率 */
function computeRates(raw: IntelligenceRawMetrics): Omit<TrendPoint, 'period'> {
  return {
    llmSuccessRate: rateOf(raw.llm.success, raw.llm.total),
    recommendationAdoptionRate: rateOf(
      raw.recommendations.adopted + raw.recommendations.modified * 0.5,
      raw.recommendations.total,
    ),
    qaAccuracy: rateOf(raw.qa.correct, raw.qa.total),
    coverageRate: rateOf(raw.coverage.covered, raw.coverage.total),
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数：告警判定（跌破阈值 / 环比下降）                              */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：依据原始快照判定告警。
 *
 * 两类触发：
 *  1. 绝对值跌破：现值 < critical 阈值 → critical；< warning 阈值 → warning；
 *  2. 环比下降：相对 history 中最近一个周期，现值下降幅度 ≥ dropWarnDelta →
 *     warning，≥ dropCritDelta → critical（无历史点时不判环比）。
 *
 * 同一指标可能同时命中绝对值与环比，取更严重的一条。
 */
export function checkAlerts(
  raw: IntelligenceRawMetrics,
  thresholds: IntelligenceThresholds = DEFAULT_INTELLIGENCE_THRESHOLDS,
): IntelligenceAlert[] {
  const rates = computeRates(raw);
  const prev = raw.history.length > 0 ? raw.history[raw.history.length - 1] : null;

  const alerts: IntelligenceAlert[] = [];

  for (const meta of METRIC_META) {
    const current = rates[meta.key];
    const warn = meta.warn(thresholds);
    const crit = meta.crit(thresholds);

    let severity: AlertSeverity | null = null;
    let threshold = 0;
    let message = '';

    /* ① 绝对值跌破 */
    if (current < crit) {
      severity = 'critical';
      threshold = crit;
      message = `${meta.name} ${(current * 100).toFixed(1)}% 已严重跌破红线 ${(crit * 100).toFixed(0)}%`;
    } else if (current < warn) {
      severity = 'warning';
      threshold = warn;
      message = `${meta.name} ${(current * 100).toFixed(1)}% 低于预警线 ${(warn * 100).toFixed(0)}%`;
    }

    /* ② 环比下降（在已判等级上，取更严重者） */
    if (prev) {
      const prevVal = prev[meta.key];
      const delta = prevVal - current; // 正值表示下降
      if (delta >= thresholds.dropCritDelta) {
        const s: AlertSeverity = 'critical';
        if (!severity || s === 'critical') {
          severity = s;
          threshold = prevVal;
          message = `${meta.name} 环比骤降 ${(delta * 100).toFixed(1)} 个百分点（${(prevVal * 100).toFixed(1)}% → ${(current * 100).toFixed(1)}%）`;
        }
      } else if (delta >= thresholds.dropWarnDelta) {
        if (severity !== 'critical') {
          severity = 'warning';
          threshold = prevVal;
          message = `${meta.name} 环比下降 ${(delta * 100).toFixed(1)} 个百分点（${(prevVal * 100).toFixed(1)}% → ${(current * 100).toFixed(1)}%）`;
        }
      }
    }

    if (severity) {
      alerts.push({ key: meta.key, name: meta.name, current, threshold, severity, message });
    }
  }

  // critical 排在前，便于前端「红色告警」置顶
  return alerts.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1,
  );
}

/* ------------------------------------------------------------------ */
/* 纯函数：看板组装                                                     */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：原始快照 → 系统智能度看板。
 *
 * - 折算四项现值比率；
 * - 趋势序列 = history（旧→新）末尾追加当前周期点，保证趋势线与现值衔接；
 * - 告警复用 checkAlerts。
 *
 * @param raw        原始计数快照
 * @param thresholds 阈值（默认 DEFAULT_INTELLIGENCE_THRESHOLDS）
 * @param period     当前周期标签（注入，避免读时钟）；不传则当前点 period='current'
 * @param nowIso     生成时间（注入，便于测试）；默认 new Date().toISOString()
 */
export function buildSystemIntelligenceDashboard(
  raw: IntelligenceRawMetrics,
  thresholds: IntelligenceThresholds = DEFAULT_INTELLIGENCE_THRESHOLDS,
  period = 'current',
  nowIso: string = new Date().toISOString(),
): SystemIntelligenceDashboard {
  const rates = computeRates(raw);
  const trends: TrendPoint[] = [
    ...raw.history,
    { period, ...rates },
  ];

  return {
    demo: raw.demo,
    generatedAt: nowIso,
    llmSuccessRate: rates.llmSuccessRate,
    recommendationAdoptionRate: rates.recommendationAdoptionRate,
    qaAccuracy: rates.qaAccuracy,
    coverageRate: rates.coverageRate,
    sampleSizes: {
      llmCalls: raw.llm.total,
      recommendations: raw.recommendations.total,
      qaSamples: raw.qa.total,
      coverageScenarios: raw.coverage.total,
    },
    trends,
    alerts: checkAlerts(raw, thresholds),
  };
}

/* ------------------------------------------------------------------ */
/* 进程内内存采集（零新依赖）                                           */
/* ------------------------------------------------------------------ */

/** 趋势序列最大保留周期数（滚动窗口） */
const HISTORY_CAP = 12;

const counter = {
  llmTotal: 0,
  llmSuccess: 0,
  recTotal: 0,
  recAdopted: 0,
  recModified: 0,
  qaTotal: 0,
  qaCorrect: 0,
  coverageTotal: 0,
  coverageCovered: 0,
};

/** 滚动历史序列（由旧到新） */
const historyBuffer: TrendPoint[] = [];

/** 记录一次大模型调用 */
export function recordLlmCall(success: boolean): void {
  counter.llmTotal += 1;
  if (success) counter.llmSuccess += 1;
}

/** 记录一条建议的医生决策 */
export function recordRecommendationDecision(decision: 'adopted' | 'modified' | 'rejected'): void {
  counter.recTotal += 1;
  if (decision === 'adopted') counter.recAdopted += 1;
  else if (decision === 'modified') counter.recModified += 1;
}

/** 记录一次知识问答结果 */
export function recordQaResult(correct: boolean): void {
  counter.qaTotal += 1;
  if (correct) counter.qaCorrect += 1;
}

/** 登记一个业务场景的覆盖情况 */
export function recordCoverageScenario(covered: boolean): void {
  counter.coverageTotal += 1;
  if (covered) counter.coverageCovered += 1;
}

/**
 * 将当前累计比率作为一个历史周期压入滚动窗口（周期调度触发；本模块不自带定时器）。
 * counters 不重置——趋势刻画的是「调用快照」而非重置后的增量，避免冷启动抖动。
 */
export function snapshotIntelligencePeriod(period: string): void {
  const rates = computeRates({
    demo: false,
    llm: { total: counter.llmTotal, success: counter.llmSuccess },
    recommendations: {
      total: counter.recTotal,
      adopted: counter.recAdopted,
      modified: counter.recModified,
    },
    qa: { total: counter.qaTotal, correct: counter.qaCorrect },
    coverage: { total: counter.coverageTotal, covered: counter.coverageCovered },
    history: [],
  });
  historyBuffer.push({ period, ...rates });
  while (historyBuffer.length > HISTORY_CAP) historyBuffer.shift();
}

/** 采集当前原始快照（路由层唯一入口） */
export function collectRawMetrics(): IntelligenceRawMetrics {
  const hasSamples =
    counter.llmTotal > 0 || counter.recTotal > 0 || counter.qaTotal > 0 || counter.coverageTotal > 0;
  return {
    demo: !hasSamples,
    llm: { total: counter.llmTotal, success: counter.llmSuccess },
    recommendations: {
      total: counter.recTotal,
      adopted: counter.recAdopted,
      modified: counter.recModified,
    },
    qa: { total: counter.qaTotal, correct: counter.qaCorrect },
    coverage: { total: counter.coverageTotal, covered: counter.coverageCovered },
    history: historyBuffer.map((p) => ({ ...p })),
  };
}
