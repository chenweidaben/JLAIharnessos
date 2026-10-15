/**
 * 健澜科技 jlmedaios - 管理员 MUSE 决策经验聚合器（M116-C）
 *
 * 依据宪法第七章 7.6（管理员 MUSE：院长 / 职能科室主任的决策经验沉淀）：
 *   从管理员本人的历史决策记忆（medmuse.admin_decision_memory）中聚合
 *   「越用越懂这位管理员」的决策经验视图——总决策数、平均量化改善
 *   （avgMetricImprovement）、决策 ROI 排行（roiRanking）与管理经验
 *   时间线（decisionTimeline）。
 *
 * 设计要点：
 *  - buildAdminMuse / computeROI 为纯函数：不打库、不读环境、不修改入参；
 *    便于单测与前端侧本地复用；
 *  - outcomes 为「事后实测效果观察」列表（路由层可由独立效果评估表注入），
 *    按 decisionId 覆盖决策自带的 resultMetric；缺省时回落到决策自身的
 *    result_metric，二者皆缺则按 0 处理；
 *  - ROI 按结局加权：success = +metric，mixed = +metric*0.5，failure = -metric；
 *    保留 2 位小数，输出确定可快照；
 *  - 任一入参为 null / undefined / 空数组时返回零值兜底视图，绝不抛错；
 *  - 聚合只使用脱敏后的管理决策摘要，不落患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 管理决策结局三态（与 medmuse.admin_decision_memory.outcome CHECK 一致） */
export type AdminDecisionOutcome = 'success' | 'failure' | 'mixed';

/**
 * 一条管理决策记忆（对应 medmuse.admin_decision_memory 一行；
 * context 已在入库前脱敏，纯函数侧只读取结构化字段）。
 */
export interface AdminDecision {
  /** 决策主键（uuid） */
  id: string;
  /** 管理员脱敏工号 */
  adminId: string;
  /** 决策类别：预算 / 人事 / 流程 / 采购 / 绩效 … */
  decisionType: string;
  /** 决策上下文摘要（脱敏文本） */
  context: string;
  /** 实际采取的管理动作 */
  action: string;
  /** 事后量化效果（正=改善，负=恶化；可空=未量化） */
  resultMetric: number | null;
  /** 结局：成功 / 失败 / 混合 */
  outcome: AdminDecisionOutcome;
  /** 决策发生时间（ISO 8601） */
  createdAt: string;
}

/**
 * 事后实测效果观察（独立效果评估侧注入；按 decisionId 覆盖决策自带
 * 的 result_metric，使 ROI 与平均改善口径以「实测」为准）。
 */
export interface AdminOutcomeObservation {
  /** 被评估的决策 id（对应 AdminDecision.id） */
  decisionId: string;
  /** 实测改善值（与 result_metric 同量纲） */
  measuredImprovement: number;
}

/** ROI 排行单条 */
export interface AdminRoiRankItem {
  /** 决策 id */
  id: string;
  /** 决策类别 */
  decisionType: string;
  /** 管理动作摘要 */
  action: string;
  /** 结局（前端按结局着色） */
  outcome: AdminDecisionOutcome;
  /** 生效量化改善值（实测覆盖后；未量化为 0） */
  resultMetric: number;
  /** 本条决策 ROI（2 位小数） */
  roi: number;
}

/** 管理经验时间线单条 */
export interface AdminTimelineItem {
  /** yyyy-MM-dd */
  date: string;
  /** 决策类别 */
  decisionType: string;
  /** 管理动作摘要 */
  action: string;
  /** 结局（前端按结局着色） */
  outcome: AdminDecisionOutcome;
  /** 生效量化改善值（未量化为 0） */
  resultMetric: number;
  /** 本条决策 ROI（2 位小数） */
  roi: number;
}

/** 管理员 MUSE 视图（与前端 web/src/pages/muse/Admin 对齐） */
export interface AdminMuseView {
  /** 累计管理决策数 */
  totalDecisions: number;
  /** 平均量化改善（有度量决策的 resultMetric 均值，2 位小数；无度量为 0） */
  avgMetricImprovement: number;
  /** 决策 ROI 排行（ROI 降序，截断 10 条） */
  roiRanking: AdminRoiRankItem[];
  /** 管理经验时间线（决策时间倒序，截断 10 条） */
  decisionTimeline: AdminTimelineItem[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** ROI 排行最多展示条数 */
export const ADMIN_ROI_RANK_LIMIT = 10;

/** 管理经验时间线最多展示条数 */
export const ADMIN_TIMELINE_LIMIT = 10;

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** round2：四舍五入到 2 位小数，避免浮点噪声导致快照不稳定 */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 两位补零 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date → yyyy-MM-dd */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 安全解析时间；非法输入返回 null */
function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 结局归一：非三态值一律归为 mixed（防御脏数据，不抛错） */
function normalizeOutcome(v: unknown): AdminDecisionOutcome {
  if (v === 'success' || v === 'failure' || v === 'mixed') return v;
  return 'mixed';
}

/** 数值归一：非有限数一律归为 null（未量化） */
function toMetric(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/* ------------------------------------------------------------------ */
/* ROI 计算（纯函数）                                                   */
/* ------------------------------------------------------------------ */

/**
 * computeROI：按管理决策的结局与量化改善值计算 ROI。
 *
 * 口径：
 *  - success：正收益，ROI = +resultMetric；
 *  - mixed  ：部分收益，ROI = +resultMetric * 0.5；
 *  - failure：负收益（决策未达预期 / 实际恶化），ROI = -resultMetric；
 *  - resultMetric 为 null / 非有限数时按 0 处理，ROI = 0。
 *
 * 纯函数：不修改入参，不读环境；返回 2 位小数。
 *
 * @param decision 只需 { resultMetric, outcome } 形状
 */
export function computeROI(decision: {
  resultMetric: number | null;
  outcome: AdminDecisionOutcome;
}): number {
  const m = toMetric(decision.resultMetric);
  if (m === null) return 0;
  if (decision.outcome === 'success') return round2(m);
  if (decision.outcome === 'mixed') return round2(m * 0.5);
  // failure
  return round2(-m);
}

/* ------------------------------------------------------------------ */
/* 纯函数主入口                                                        */
/* ------------------------------------------------------------------ */

/**
 * buildAdminMuse：从管理员历史决策记忆 + 事后实测效果观察构建个人决策经验视图。
 *
 * 聚合口径：
 *  - effectiveMetric 逐条解析：outcomes 中按 decisionId 命中的 measuredImprovement
 *    优先；否则取决策自带 resultMetric；二者皆缺为 null（未量化）；
 *  - totalDecisions    清洗后决策条数；
 *  - avgMetricImprovement 有度量（effectiveMetric 非 null）决策的均值，2 位小数；
 *                        无任何度量决策时为 0；
 *  - roiRanking        逐条用 computeROI(effectiveMetric + outcome) 计算 ROI，
 *                      按 ROI 降序（并列按时间倒序、再按 id 升序，保证可快照），
 *                      截断 10 条；
 *  - decisionTimeline  按 createdAt 倒序（无时间排最后）映射 {date, decisionType,
 *                      action, outcome, resultMetric, roi}，截断 10 条。
 *
 * 纯函数：不修改入参；任一入参为 null / undefined / 空数组时返回零值兜底视图，
 *   不抛错。staffId 仅作冷启动上下文保留（聚合指标不依赖该字段）。
 *
 * @param staffId   管理员脱敏工号
 * @param decisions 管理决策记忆行（可空）
 * @param outcomes  事后实测效果观察（可空；按 decisionId 覆盖 result_metric）
 */
export function buildAdminMuse(
  staffId: string,
  decisions: AdminDecision[] | null | undefined,
  outcomes: AdminOutcomeObservation[] | null | undefined,
): AdminMuseView {
  // staffId 仅作冷启动兜底上下文保留（无历史决策时同样输出零值视图）
  void staffId;

  const clean = (decisions ?? []).filter(
    (d): d is AdminDecision => Boolean(d) && typeof d.id === 'string',
  );

  // outcomes 索引：decisionId → measuredImprovement（仅保留有限数）
  const measured = new Map<string, number>();
  for (const o of outcomes ?? []) {
    if (!o || typeof o.decisionId !== 'string') continue;
    const v = toMetric(o.measuredImprovement);
    if (v !== null) measured.set(o.decisionId, v);
  }

  // 逐条清洗 + 解析生效度量
  const rows = clean.map((d, idx) => {
    const own = toMetric(d.resultMetric);
    const effective = measured.has(d.id) ? (measured.get(d.id) as number) : own;
    const outcome = normalizeOutcome(d.outcome);
    const metric = effective ?? 0;
    return {
      id: d.id,
      decisionType: (d.decisionType ?? '').trim() || '未分类',
      action: (d.action ?? '').trim(),
      outcome,
      metric,
      hasMetric: effective !== null,
      time: parseTime(d.createdAt),
      idx,
    };
  });

  // 总决策数
  const totalDecisions = rows.length;

  // 平均量化改善：仅统计有度量的决策
  const measuredRows = rows.filter((r) => r.hasMetric);
  const avgMetricImprovement =
    measuredRows.length > 0
      ? round2(
          measuredRows.reduce((sum, r) => sum + r.metric, 0) / measuredRows.length,
        )
      : 0;

  // ROI 排行：ROI 降序（并列：时间倒序 → id 升序），截断 10 条
  const roiRanking: AdminRoiRankItem[] = rows
    .map((r) => ({
      id: r.id,
      decisionType: r.decisionType,
      action: r.action,
      outcome: r.outcome,
      resultMetric: r.metric,
      roi: computeROI({ resultMetric: r.metric, outcome: r.outcome }),
      time: r.time,
      idx: r.idx,
    }))
    .sort((a, b) => {
      if (b.roi !== a.roi) return b.roi - a.roi;
      const at = a.time ?? Number.NEGATIVE_INFINITY;
      const bt = b.time ?? Number.NEGATIVE_INFINITY;
      if (bt !== at) return bt - at;
      return a.id.localeCompare(b.id);
    })
    .slice(0, ADMIN_ROI_RANK_LIMIT)
    .map(({ time: _t, idx: _i, ...rest }) => rest);

  // 管理经验时间线：时间倒序（无时间排最后），截断 10 条
  const decisionTimeline: AdminTimelineItem[] = rows
    .map((r) => ({ row: r, idx: r.idx }))
    .sort((a, b) => {
      const at = a.row.time ?? Number.NEGATIVE_INFINITY;
      const bt = b.row.time ?? Number.NEGATIVE_INFINITY;
      if (bt !== at) return bt - at;
      return a.idx - b.idx;
    })
    .slice(0, ADMIN_TIMELINE_LIMIT)
    .map(({ row }) => ({
      date: row.time !== null ? dateKey(new Date(row.time)) : '未知日期',
      decisionType: row.decisionType,
      action: row.action,
      outcome: row.outcome,
      resultMetric: row.metric,
      roi: computeROI({ resultMetric: row.metric, outcome: row.outcome }),
    }));

  return {
    totalDecisions,
    avgMetricImprovement,
    roiRanking,
    decisionTimeline,
  };
}
