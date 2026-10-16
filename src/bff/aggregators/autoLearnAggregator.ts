/**
 * 健澜科技 jlmedaios - M160-A 全自学习闭环聚合器（纯函数）
 *
 * 【全自学习闭环——系统自动进化】
 * 把四条业务反馈流汇成一条自动进化回路，目标：系统每周自动进化，
 * 不需人工调参：
 *   1. 医生采纳/拒绝 AI 建议  → adjustRecommendationWeights() 自动调整推荐权重；
 *   2. 患者满意度反馈        → autoLearnFromFeedback() 自动优化服务流程；
 *   3. 医疗差错报告          → autoLearnFromFeedback() 自动更新安全规则严格度；
 *   4. 质控扣分              → autoLearnFromFeedback() 自动强化薄弱环节。
 *
 * 本模块全部为无副作用纯函数，不触库、不写 SQL、无新表，便于单测；
 * 事件流的采集与权重结果的持久化由路由层 / 远期路线图中的反馈流总线负责。
 *
 * 【远期路线图】
 *   - 当前切片：以进程内事件样本驱动纯函数闭环；
 *   - 下一阶段：feedback 事件 medmuse.feedback_event_stream 落流后，
 *     本模块函数签名不变，仅替换数据来源即可接入真实闭环；
 *   - 再远期：权重进化结果回流推荐中台排序模型，形成「反馈→权重→
 *     排序→再反馈」的日级自动进化调度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 四条反馈通道 */
export type FeedbackKind = 'doctor_decision' | 'patient_satisfaction' | 'medical_error' | 'qc_deduction';

/** 医生对一条 AI 建议的最终处置 */
export type DoctorDecision = 'adopted' | 'modified' | 'rejected';

/** 严重度 */
export type Severity = 'low' | 'medium' | 'high';

/** 一条反馈事件（四通道复用同一事件结构，按 kind 取对应字段） */
export interface FeedbackEvent {
  /** 通道：医生决策 / 患者满意度 / 医疗差错 / 质控扣分 */
  kind: FeedbackKind;
  /** doctor_decision：建议类型（diagnosis / drug / pathway / lab_interpret ...） */
  suggestionType?: string;
  /** doctor_decision：医生处置决策 */
  doctorDecision?: DoctorDecision;
  /** patient_satisfaction：服务环节（registration / triage / consultation / charging / inpatient ...） */
  serviceStage?: string;
  /** patient_satisfaction：满意度评分 1~5 */
  satisfactionScore?: number;
  /** medical_error：关联的安全规则标识（如 drug_interaction_check） */
  safetyRule?: string;
  /** medical_error：差错严重度 */
  severity?: Severity;
  /** qc_deduction：质控维度（病案 / 护理 / 院感 / 合理用药 ...） */
  qcDimension?: string;
  /** qc_deduction：本次扣分数（正数） */
  deductionPoints?: number;
  /** 事件发生时间（ISO 字符串，可选，仅用于报告留痕） */
  occurredAt?: string;
}

/** 推荐权重分布：建议类型 -> 权重 */
export type WeightMap = Record<string, number>;

/** 单类型权重调整记录 */
export interface WeightChange {
  suggestionType: string;
  oldWeight: number;
  newWeight: number;
  direction: 'boost' | 'dampen' | 'hold';
  /** 采纳数（modified 按半权计入正向，此处记录原始计数） */
  adopted: number;
  rejected: number;
  /** 采纳率 [0,1]；无样本为 null */
  adoptionRate: number | null;
}

/** 服务流程优化建议（由低满意度触发） */
export interface ProcessImprovement {
  serviceStage: string;
  samples: number;
  avgSatisfaction: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

/** 安全规则升级记录（由医疗差错触发） */
export interface SafetyRuleUpdate {
  rule: string;
  errorCount: number;
  highSeverityCount: number;
  /** 新严格度：review（人工复核）→ enforce（系统强制）→ block（直接拦截） */
  newStrictness: 'review' | 'enforce' | 'block';
  action: string;
}

/** 质控薄弱环节强化记录（由质控扣分触发） */
export interface QcStrengthening {
  dimension: string;
  incidents: number;
  totalDeduction: number;
  /** 强化等级 L1~L3 */
  reinforcementLevel: 1 | 2 | 3;
  action: string;
}

/** 单次反馈学习的完整产出（四通道） */
export interface LearningOutcome {
  weightChanges: WeightChange[];
  processImprovements: ProcessImprovement[];
  safetyRuleUpdates: SafetyRuleUpdate[];
  qcStrengthenings: QcStrengthening[];
  /** 本次自动进化触发的动作总数（四项长度之和） */
  autoActionsTaken: number;
}

/** 知识缺口诊断结果 */
export interface KnowledgeGap {
  channel: 'recommendation' | 'service' | 'safety' | 'qc';
  subject: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
}

/** generateLearningReport 的周期入参 */
export interface LearningPeriod {
  /** 统计窗口天数（展示用，默认 7 = 每周自动进化） */
  days: number;
  /** 窗口内全部反馈事件 */
  events: FeedbackEvent[];
  /** 进化前的当前推荐权重分布 */
  currentWeights: WeightMap;
  /** 报告生成时间（可注入以便断言；缺省取当前时间） */
  generatedAt?: string;
}

/** 周度自学习报告 */
export interface LearningReport {
  period: { days: number; generatedAt: string };
  summary: {
    totalEvents: number;
    doctorDecisions: number;
    satisfactionSamples: number;
    medicalErrors: number;
    qcDeductionIncidents: number;
    autoActionsTaken: number;
    /** 自动进化成熟度 0~100（四通道各贡献 25，全部通道产出动作即满分） */
    evolutionScore: number;
  };
  weights: WeightChange[];
  processImprovements: ProcessImprovement[];
  safetyRuleUpdates: SafetyRuleUpdate[];
  qcStrengthenings: QcStrengthening[];
  knowledgeGaps: KnowledgeGap[];
}

/* ============================== 常量 ============================== */

/** 无历史时的默认权重（中性） */
export const DEFAULT_WEIGHT = 1.0;
/** 权重下限：反复被拒绝也保留少量曝光，避免类型被雪藏 */
export const MIN_WEIGHT = 0.1;
/** 权重上限：防止某类型无限放大挤占其他建议 */
export const MAX_WEIGHT = 2.0;
/** 升权阈值：采纳率严格大于该值时权重放大 */
export const BOOST_THRESHOLD = 0.7;
/** 降权阈值：采纳率严格小于该值时权重压缩 */
export const DAMPEN_THRESHOLD = 0.3;
/** 升权倍率 */
export const BOOST_FACTOR = 1.15;
/** 降权倍率 */
export const DAMPEN_FACTOR = 0.85;
/** modified（修改后采纳）折算为正向的半权 */
export const MODIFIED_HALF_WEIGHT = 0.5;
/** 满意度合格线：均值低于此值触发服务流程优化 */
export const SATISFACTION_OK = 4.0;
/** 满意度高优先级线：均值低于此值判为高优先级 */
export const SATISFACTION_HIGH = 3.5;
/** 触发知识缺口诊断的最少样本数（医生通道） */
export const MIN_SAMPLES_FOR_GAP = 5;
/** 触发知识缺口诊断的最少样本数（满意度通道） */
export const MIN_SAMPLES_SATISFACTION = 3;
/** 质控累计扣分触发高优先级强化的门槛 */
export const QC_DEDUCTION_HIGH = 10;
/** 质控累计扣分触发中优先级强化的门槛 */
export const QC_DEDUCTION_MEDIUM = 5;

/* ============================== 工具函数 ============================== */

/** 保留两位小数，避免浮点长尾 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 统计某建议类型在医生决策事件中的采纳/拒绝计数。
 * modified 计入正向半权（adopted 原始计数仍单独记录）。
 */
function collectDoctorStats(events: FeedbackEvent[]): Map<string, { adopted: number; modified: number; rejected: number }> {
  const map = new Map<string, { adopted: number; modified: number; rejected: number }>();
  for (const e of events) {
    if (e.kind !== 'doctor_decision') continue;
    const key = e.suggestionType || 'unknown';
    let row = map.get(key);
    if (!row) {
      row = { adopted: 0, modified: 0, rejected: 0 };
      map.set(key, row);
    }
    if (e.doctorDecision === 'adopted') row.adopted += 1;
    else if (e.doctorDecision === 'modified') row.modified += 1;
    else if (e.doctorDecision === 'rejected') row.rejected += 1;
  }
  return map;
}

/**
 * 由采纳/修改/拒绝计数折算有效采纳率。
 * modified 按半权计入正向；无样本时返回 null（冷启动不干预）。
 */
export function adoptionRateOf(stats: { adopted: number; modified: number; rejected: number }): number | null {
  const positive = stats.adopted + stats.modified * MODIFIED_HALF_WEIGHT;
  const total = positive + stats.rejected;
  if (total <= 0) return null;
  return positive / total;
}

/* ============================== 核心纯函数 ============================== */

/**
 * adjustRecommendationWeights —— 医生采纳/拒绝 AI 建议 → 自动调整推荐权重。
 *
 * 规则（真实进化，非摆设）：
 *   1. 对 currentWeights 中每个建议类型，取窗口内医生决策事件；
 *   2. 采纳率 > 0.7 → w' = w × 1.15（升权，优先展示）；
 *      采纳率 < 0.3 → w' = w × 0.85（降权，弱化后置）；
 *      中间区间或无样本 → 保持不动；
 *   3. 事件中出现但当前权重表缺失的新类型，以 DEFAULT_WEIGHT 起评再施加倍率；
 *   4. 逐权重截断到 [0.1, 2.0]，防止权重发散或塌陷。
 *
 * 不修改入参，返回新对象。
 *
 * @param input.currentWeights 进化前权重分布
 * @param input.events         窗口内反馈事件（仅 doctor_decision 参与权重调整）
 */
export function adjustRecommendationWeights(input: {
  currentWeights: WeightMap;
  events: FeedbackEvent[];
}): { weights: WeightMap; changes: WeightChange[] } {
  const { currentWeights, events } = input;
  const stats = collectDoctorStats(events);

  // 键集合：现有权重 ∪ 事件中新出现的建议类型
  const keys = new Set<string>([...Object.keys(currentWeights), ...stats.keys()]);

  const weights: WeightMap = {};
  const changes: WeightChange[] = [];

  for (const key of keys) {
    const oldWeight = currentWeights[key] ?? DEFAULT_WEIGHT;
    const s = stats.get(key);
    let newWeight = oldWeight;
    let direction: WeightChange['direction'] = 'hold';

    if (s) {
      const rate = adoptionRateOf(s);
      if (rate !== null) {
        if (rate > BOOST_THRESHOLD) {
          newWeight = oldWeight * BOOST_FACTOR;
          direction = 'boost';
        } else if (rate < DAMPEN_THRESHOLD) {
          newWeight = oldWeight * DAMPEN_FACTOR;
          direction = 'dampen';
        }
      }
      const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, newWeight));
      weights[key] = round2(clamped);
      changes.push({
        suggestionType: key,
        oldWeight,
        newWeight: weights[key],
        direction,
        adopted: s.adopted,
        rejected: s.rejected,
        adoptionRate: rate === null ? null : round2(rate),
      });
    } else {
      // 无反馈：保持不动，不产生调整记录
      weights[key] = oldWeight;
    }
  }

  return { weights, changes };
}

/**
 * autoLearnFromFeedback —— 四通道反馈 → 自动进化动作集。
 *
 * 闭环落点：
 *   - doctor_decision 通道：复用 adjustRecommendationWeights 产出权重调整；
 *   - patient_satisfaction 通道：服务环节均值低于合格线 → 自动生成流程优化动作；
 *   - medical_error 通道：同一安全规则反复触发 → 自动升级规则严格度
 *     （review → enforce → block），差错率高即拦截，不需人工改配置；
 *   - qc_deduction 通道：质控维度累计扣分 → 自动强化该薄弱环节 L1~L3。
 *
 * 全部为确定性折算，不读外部状态。
 *
 * @param events         窗口内全部反馈事件
 * @param currentWeights 进化前推荐权重分布（可选，缺省用中性权重）
 */
export function autoLearnFromFeedback(
  events: FeedbackEvent[],
  currentWeights: WeightMap = {},
): LearningOutcome {
  /* ---- 通道 1：医生决策 → 推荐权重 ---- */
  const { weights, changes } = adjustRecommendationWeights({ currentWeights, events });
  void weights;

  /* ---- 通道 2：患者满意度 → 服务流程优化 ---- */
  const satMap = new Map<string, { sum: number; n: number }>();
  for (const e of events) {
    if (e.kind !== 'patient_satisfaction') continue;
    const stage = e.serviceStage || 'unknown';
    let row = satMap.get(stage);
    if (!row) {
      row = { sum: 0, n: 0 };
      satMap.set(stage, row);
    }
    if (typeof e.satisfactionScore === 'number') {
      row.sum += e.satisfactionScore;
      row.n += 1;
    }
  }
  const processImprovements: ProcessImprovement[] = [];
  for (const [stage, row] of satMap) {
    if (row.n === 0) continue;
    const avg = row.sum / row.n;
    if (avg >= SATISFACTION_OK) continue;
    const priority: ProcessImprovement['priority'] = avg < SATISFACTION_HIGH ? 'high' : 'medium';
    processImprovements.push({
      serviceStage: stage,
      samples: row.n,
      avgSatisfaction: round2(avg),
      priority,
      action: `自动优化「${stage}」服务流程：满意度均值 ${avg.toFixed(2)} 低于合格线 ${SATISFACTION_OK}，下周起自动加压该环节 SOP 巡检与高峰人力调度`,
    });
  }

  /* ---- 通道 3：医疗差错 → 安全规则升级 ---- */
  const errMap = new Map<string, { count: number; high: number }>();
  for (const e of events) {
    if (e.kind !== 'medical_error') continue;
    const rule = e.safetyRule || 'unknown';
    let row = errMap.get(rule);
    if (!row) {
      row = { count: 0, high: 0 };
      errMap.set(rule, row);
    }
    row.count += 1;
    if (e.severity === 'high') row.high += 1;
  }
  const safetyRuleUpdates: SafetyRuleUpdate[] = [];
  for (const [rule, row] of errMap) {
    let newStrictness: SafetyRuleUpdate['newStrictness'] = 'review';
    if (row.high >= 1) newStrictness = 'block';
    else if (row.count >= 3) newStrictness = 'enforce';
    safetyRuleUpdates.push({
      rule,
      errorCount: row.count,
      highSeverityCount: row.high,
      newStrictness,
      action: `自动升级安全规则「${rule}」：本周期 ${row.count} 起差错（高危 ${row.high}），严格度 → ${newStrictness === 'block' ? '直接拦截' : newStrictness === 'enforce' ? '系统强制' : '人工复核'}`,
    });
  }

  /* ---- 通道 4：质控扣分 → 薄弱环节强化 ---- */
  const qcMap = new Map<string, { incidents: number; points: number }>();
  for (const e of events) {
    if (e.kind !== 'qc_deduction') continue;
    const dim = e.qcDimension || 'unknown';
    let row = qcMap.get(dim);
    if (!row) {
      row = { incidents: 0, points: 0 };
      qcMap.set(dim, row);
    }
    row.incidents += 1;
    row.points += Math.max(0, e.deductionPoints ?? 0);
  }
  const qcStrengthenings: QcStrengthening[] = [];
  for (const [dim, row] of qcMap) {
    const level = row.points >= QC_DEDUCTION_HIGH ? 3 : row.points >= QC_DEDUCTION_MEDIUM ? 2 : 1;
    qcStrengthenings.push({
      dimension: dim,
      incidents: row.incidents,
      totalDeduction: row.points,
      reinforcementLevel: level as 1 | 2 | 3,
      action: `自动强化质控薄弱环节「${dim}」：本周期累计扣 ${row.points} 分（${row.incidents} 起），强化等级 L${level}（增加日抽样与科室复盘频次）`,
    });
  }

  return {
    weightChanges: changes,
    processImprovements,
    safetyRuleUpdates,
    qcStrengthenings,
    autoActionsTaken: changes.length + processImprovements.length + safetyRuleUpdates.length + qcStrengthenings.length,
  };
}

/**
 * detectKnowledgeGap —— 诊断系统当前的知识缺口（哪里没学会、哪里没覆盖到）。
 *
 * 缺口判定（确定性阈值）：
 *   - recommendation：样本 ≥5 且采纳率 < 0.3 → high；采纳率 < 0.5 → medium
 *     （AI 反复推同类型建议但医生不买账，说明该域知识缺失或过时）；
 *   - service：样本 ≥3 且满意度均值 < 3.5 → high；< 4.0 → medium；
 *   - safety：任一高危差错事件 → high（该规则对应的临床知识必须补强）；
 *   - qc：维度累计扣分 ≥ 10 → high；≥ 5 → medium。
 *
 * @param events 窗口内反馈事件
 * @returns 知识缺口列表（按严重度 high→medium→low 排序）
 */
export function detectKnowledgeGap(events: FeedbackEvent[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  /* 推荐通道 */
  const stats = collectDoctorStats(events);
  for (const [type, s] of stats) {
    const samples = s.adopted + s.modified + s.rejected;
    const rate = adoptionRateOf(s);
    if (samples >= MIN_SAMPLES_FOR_GAP && rate !== null && rate < DAMPEN_THRESHOLD) {
      gaps.push({
        channel: 'recommendation',
        subject: `AI 建议类型「${type}」`,
        severity: 'high',
        evidence: `样本 ${samples} 条，采纳率仅 ${(rate * 100).toFixed(0)}%（低于 30%）`,
        suggestion: '补充该领域最新临床指南证据并重训推荐排序，暂停高置信度推送直至采纳率回升',
      });
    } else if (samples >= MIN_SAMPLES_FOR_GAP && rate !== null && rate < 0.5) {
      gaps.push({
        channel: 'recommendation',
        subject: `AI 建议类型「${type}」`,
        severity: 'medium',
        evidence: `样本 ${samples} 条，采纳率 ${(rate * 100).toFixed(0)}%（处于观望区间）`,
        suggestion: '引入科室专家反馈标注，校准该类建议的触发场景',
      });
    }
  }

  /* 服务通道 */
  const satMap = new Map<string, { sum: number; n: number }>();
  for (const e of events) {
    if (e.kind !== 'patient_satisfaction') continue;
    const stage = e.serviceStage || 'unknown';
    let row = satMap.get(stage);
    if (!row) {
      row = { sum: 0, n: 0 };
      satMap.set(stage, row);
    }
    if (typeof e.satisfactionScore === 'number') {
      row.sum += e.satisfactionScore;
      row.n += 1;
    }
  }
  for (const [stage, row] of satMap) {
    if (row.n < MIN_SAMPLES_SATISFACTION) continue;
    const avg = row.sum / row.n;
    if (avg < SATISFACTION_HIGH) {
      gaps.push({
        channel: 'service',
        subject: `服务环节「${stage}」`,
        severity: 'high',
        evidence: `样本 ${row.n} 条，满意度均值 ${avg.toFixed(2)}（低于 ${SATISFACTION_HIGH}）`,
        suggestion: '启动流程再造：拆解排队/指引/结算动线，下周回访验证',
      });
    } else if (avg < SATISFACTION_OK) {
      gaps.push({
        channel: 'service',
        subject: `服务环节「${stage}」`,
        severity: 'medium',
        evidence: `样本 ${row.n} 条，满意度均值 ${avg.toFixed(2)}（低于合格线 ${SATISFACTION_OK}）`,
        suggestion: '纳入服务巡检重点观察项，优化话术与指引物料',
      });
    }
  }

  /* 安全通道：任一高危差错即缺口 */
  const errRules = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'medical_error' || e.severity !== 'high') continue;
    const rule = e.safetyRule || 'unknown';
    errRules.set(rule, (errRules.get(rule) ?? 0) + 1);
  }
  for (const [rule, n] of errRules) {
    gaps.push({
      channel: 'safety',
      subject: `安全规则「${rule}」`,
      severity: 'high',
      evidence: `本周期 ${n} 起高危差错仍未拦截成功`,
      suggestion: '升级为硬拦截规则并组织用药/诊疗专项培训，复查规则知识库',
    });
  }

  /* 质控通道 */
  const qcMap = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'qc_deduction') continue;
    const dim = e.qcDimension || 'unknown';
    qcMap.set(dim, (qcMap.get(dim) ?? 0) + Math.max(0, e.deductionPoints ?? 0));
  }
  for (const [dim, points] of qcMap) {
    if (points >= QC_DEDUCTION_HIGH) {
      gaps.push({
        channel: 'qc',
        subject: `质控维度「${dim}」`,
        severity: 'high',
        evidence: `累计扣分 ${points} 分（≥ ${QC_DEDUCTION_HIGH}）`,
        suggestion: '列入主任周会复盘，自动生成整改任务并追踪闭环',
      });
    } else if (points >= QC_DEDUCTION_MEDIUM) {
      gaps.push({
        channel: 'qc',
        subject: `质控维度「${dim}」`,
        severity: 'medium',
        evidence: `累计扣分 ${points} 分（≥ ${QC_DEDUCTION_MEDIUM}）`,
        suggestion: '增加该维度月度专项抽检比例',
      });
    }
  }

  /* 排序：high → medium → low，同类按 subject 字典序保证确定性 */
  const order = { high: 0, medium: 1, low: 2 } as const;
  gaps.sort((a, b) => order[a.severity] - order[b.severity] || a.subject.localeCompare(b.subject, 'zh'));
  return gaps;
}

/**
 * generateLearningReport —— 生成周度自学习报告（系统自动进化的一页总账）。
 *
 * 报告内容 = autoLearnFromFeedback 的四通道动作集 + detectKnowledgeGap 的
 * 缺口诊断 + 汇总指标（事件量 / 自动动作数 / 自动进化成熟度评分）。
 *
 * 成熟度评分口径（可解释）：四通道各占 25 分，该通道本周期产出至少一条
 * 进化动作即得 25 分；上限 100。分数随反馈闭环真实产出而升降，不人工调参。
 *
 * @param period 统计窗口（天数 + 事件 + 当前权重 + 可选生成时间）
 */
export function generateLearningReport(period: LearningPeriod): LearningReport {
  const outcome = autoLearnFromFeedback(period.events, period.currentWeights);
  const gaps = detectKnowledgeGap(period.events);

  let doctorDecisions = 0;
  let satisfactionSamples = 0;
  let medicalErrors = 0;
  let qcDeductionIncidents = 0;
  for (const e of period.events) {
    if (e.kind === 'doctor_decision') doctorDecisions += 1;
    else if (e.kind === 'patient_satisfaction') satisfactionSamples += 1;
    else if (e.kind === 'medical_error') medicalErrors += 1;
    else if (e.kind === 'qc_deduction') qcDeductionIncidents += 1;
  }

  /* 成熟度：四通道各 25，按本周期是否真实产出进化动作计分 */
  let evolutionScore = 0;
  if (outcome.weightChanges.length > 0) evolutionScore += 25;
  if (outcome.processImprovements.length > 0) evolutionScore += 25;
  if (outcome.safetyRuleUpdates.length > 0) evolutionScore += 25;
  if (outcome.qcStrengthenings.length > 0) evolutionScore += 25;

  return {
    period: {
      days: period.days,
      generatedAt: period.generatedAt ?? new Date().toISOString(),
    },
    summary: {
      totalEvents: period.events.length,
      doctorDecisions,
      satisfactionSamples,
      medicalErrors,
      qcDeductionIncidents,
      autoActionsTaken: outcome.autoActionsTaken,
      evolutionScore,
    },
    weights: outcome.weightChanges,
    processImprovements: outcome.processImprovements,
    safetyRuleUpdates: outcome.safetyRuleUpdates,
    qcStrengthenings: outcome.qcStrengthenings,
    knowledgeGaps: gaps,
  };
}
