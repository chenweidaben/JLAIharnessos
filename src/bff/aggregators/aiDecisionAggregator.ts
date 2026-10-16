/**
 * 健澜科技 jlmedaios - AI 医院大脑深化：智能决策支持聚合器（M164-B）
 *
 * 【数据中台与AI大脑】本切片回答「AI 建议凭什么能落地」：
 *   不做「建议关注」式的空话，每个方案都给出——
 *     1. 具体动作（action）：增派 2 名副高门诊、开放 4 个采血窗口……
 *     2. 量化收益（expectedBenefit）：预计平均候诊时长下降 X 分钟、释放 Y 张床……
 *     3. 成本（costPerRun）与风险（riskLevel / riskNote）：花多少钱、有什么坑；
 *     4. 见效时间（timeToEffectMin）：多久能看到效果；
 *     5. 方案排序（rankDecisionOptions）：按收益/成本/风险/见效四维加权打分；
 *     6. 影响评估（estimateDecisionImpact）：把推荐方案折算成 ROI 与置信度；
 *     7. 效果跟踪（monitorDecisionOutcome）：事后用「实际 vs 预期」闭环，反哺下一次建议。
 *
 * 覆盖四类高频院级决策场景：
 *   - outpatientPeak 门诊高峰 → 增医生 / 开窗口 / 引导预约分流；
 *   - bedTight      床位紧张 → 加快出院 / 加床 / 转康复机构；
 *   - drugStockLow  药品库存低 → 紧急采购 / 同类替代；
 *   - qcDeductionHigh 质控扣分多 → 专项整改 / 靶向培训。
 *
 * 纯函数红线：不读库、不发请求、不触碰 WebSocket、不写 SQL、不新增依赖；
 *   全部逻辑可单测、可复现（固定输入必得固定输出）。
 *
 * 医疗安全红线：仅院级 / 科室级聚合，不含患者 PII；建议为辅助决策，
 *   最终由当班院领导 / 科主任本人确认执行；涉及加床、出院、药品替代的
 *   风险提示不可省略。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 输入类型
// ---------------------------------------------------------------------------

/** 决策场景枚举 */
export type DecisionScenarioType =
  | 'outpatientPeak'
  | 'bedTight'
  | 'drugStockLow'
  | 'qcDeductionHigh';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 落地代价 */
export type EffortLevel = 'low' | 'medium' | 'high';

/** 智能决策上下文（由 BFF 从数据中台拼装；缺省字段走演示默认值） */
export interface DecisionContext {
  /** 场景；缺省为 auto（按指标自动判定，演示默认门诊高峰） */
  scenario?: DecisionScenarioType | 'auto';
  /** 医院信息 */
  hospital?: { code: string; name: string };
  /** 科室名称（质控 / 药品场景用） */
  deptName?: string;

  // —— 门诊高峰 ——
  /** 今日门诊量（人次） */
  outpatientToday?: number;
  /** 近 7 日同期均值（人次） */
  outpatientBaseline?: number;
  /** 当前平均候诊时长（分钟） */
  avgWaitMinutes?: number;

  // —— 床位紧张 ——
  /** 床位使用率 % */
  bedRate?: number;
  /** 待入院排队人数 */
  pendingAdmissions?: number;

  // —— 药品库存低 ——
  /** 某关键药品当前可售天数 */
  drugStockDays?: number;
  /** 该药品日消耗（盒/支） */
  drugDailyConsume?: number;
  /** 药品单价（元） */
  drugUnitPrice?: number;

  // —— 质控扣分多 ——
  /** 本月累计质控扣分 */
  qcDeductionThisMonth?: number;
  /** 近 3 月平均扣分（基线） */
  qcDeductionBaseline?: number;
}

// ---------------------------------------------------------------------------
// 输出类型
// ---------------------------------------------------------------------------

/** 量化收益（按场景取对应字段，其余为 undefined） */
export interface ExpectedBenefit {
  /** 预计平均候诊时长下降（分钟） */
  waitReductionMin?: number;
  /** 预计释放 / 增加床位数 */
  bedRelief?: number;
  /** 预计恢复库存天数 */
  stockDaysRestored?: number;
  /** 预计质控扣分下降（分） */
  qcDeductionDrop?: number;
  /** 预计满意度提升（分，0~100） */
  satisfactionGain?: number;
}

/** 单个候选项方案 */
export interface DecisionOption {
  optionId: string;
  scenario: DecisionScenarioType;
  /** 方案名（如「增派门诊医生」） */
  title: string;
  /** 具体可执行动作（不空泛） */
  action: string;
  /** 为什么有效（依据） */
  rationale: string;
  /** 预估投入（元，单次 / 当日） */
  costPerRun: number;
  /** 量化收益 */
  benefit: ExpectedBenefit;
  /** 收益分 0~100（越大越值得做） */
  benefitScore: number;
  riskLevel: RiskLevel;
  /** 风险与注意事项（不可省） */
  riskNote: string;
  effort: EffortLevel;
  /** 预计见效时间（分钟） */
  timeToEffectMin: number;
}

/** 排序权重（四维） */
export interface DecisionCriteria {
  /** 收益权重 */
  wBenefit: number;
  /** 成本权重（越低成本越高分） */
  wCost: number;
  /** 风险权重（越低风险越高分） */
  wRisk: number;
  /** 见效速度权重 */
  wSpeed: number;
}

/** 默认权重：收益优先，兼顾成本与风险，速度次之 */
export const DEFAULT_DECISION_CRITERIA: DecisionCriteria = {
  wBenefit: 0.4,
  wCost: 0.25,
  wRisk: 0.2,
  wSpeed: 0.15,
};

/** 排序后的候选项（带总分与名次） */
export interface RankedOption extends DecisionOption {
  /** 综合得分 0~100 */
  totalScore: number;
  /** 名次 1 起 */
  rank: number;
  /** 是否为最终推荐 */
  recommended: boolean;
}

/** 影响评估结果 */
export interface DecisionImpact {
  optionId: string;
  title: string;
  /** 预估投入（元） */
  estimatedCost: number;
  /** 预估可货币化收益（元/当日） */
  estimatedBenefitValue: number;
  /** 投入产出比 ROI = 收益 / 成本（成本为 0 时记 null） */
  roi: number | null;
  /** 量化指标改善 */
  benefit: ExpectedBenefit;
  /** 置信度 0~1（演示场景取固定基线置信） */
  confidence: number;
  /** 落地前提与注意事项 */
  caveats: string[];
}

/** 效果跟踪的实际结果上报 */
export interface DecisionOutcomeReport {
  /** 方案对应指标名（如 waitReductionMin） */
  metric: string;
  /** 预测值 */
  expected: number;
  /** 实际值 */
  actual: number;
  /** 计划投入（元） */
  costPlanned: number;
  /** 实际投入（元） */
  costActual: number;
  /** 执行时间 ISO */
  executedAt?: string;
}

/** 效果跟踪闭环结论 */
export interface DecisionOutcomeResult {
  decisionId: string;
  metric: string;
  expected: number;
  actual: number;
  /** 达成率 = actual / expected（绝对值），>1 截断为 1 */
  achievedRatio: number;
  /** 相对偏差 % */
  deviationPct: number;
  /** 结论：达成 / 部分达成 / 未达成 */
  verdict: 'achieved' | 'partial' | 'missed';
  /** 成本偏差 %（实际 - 计划）/ 计划 */
  costDeviationPct: number | null;
  /** 经验沉淀（反哺下一次建议） */
  learning: string;
  /** 下一步动作建议 */
  nextAction: string;
}

/** buildAIDecisionSupport 总装结果 */
export interface AIDecisionSupport {
  generatedAt: string;
  demo: boolean;
  hospital: { code: string; name: string };
  scenario: DecisionScenarioType;
  scenarioLabel: string;
  /** 触发该决策的关键事实（数据中台口径） */
  triggerFacts: string[];
  /** 全部候选项（已排序） */
  options: RankedOption[];
  /** 第一名推荐方案 */
  recommended: RankedOption;
  /** 推荐方案的影响评估 */
  impact: DecisionImpact;
  /** 说明 */
  notice?: string;
}

// ---------------------------------------------------------------------------
// 常量（阈值，单测可引用）
// ---------------------------------------------------------------------------

/** 门诊高峰判定：今日较基线偏离 ≥ 20% */
export const OUTPATIENT_PEAK_DEVIATION = 0.2;
/** 床位紧张判定：床位率 ≥ 92% */
export const BED_TIGHT_RATE = 92;
/** 药品库存预警：可售天数 ≤ 7 天 */
export const DRUG_LOW_STOCK_DAYS = 7;
/** 质控扣分恶化：本月较基线多扣 ≥ 30% */
export const QC_HIGH_DEDUCTION = 0.3;

/** 风险权重换算（打分用） */
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 0, medium: 0.25, high: 0.5 };
const EFFORT_COST_FACTOR: Record<EffortLevel, number> = { low: 1, medium: 1.6, high: 2.4 };

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 按当前上下文 + 基线，自动判定场景（演示默认门诊高峰） */
function detectScenario(ctx: DecisionContext): DecisionScenarioType {
  if (ctx.scenario && ctx.scenario !== 'auto') return ctx.scenario;

  // 药品库存：信号最强、阈值明确，优先判
  if (typeof ctx.drugStockDays === 'number' && ctx.drugStockDays <= DRUG_LOW_STOCK_DAYS) {
    return 'drugStockLow';
  }
  if (typeof ctx.bedRate === 'number' && ctx.bedRate >= BED_TIGHT_RATE) {
    return 'bedTight';
  }
  if (typeof ctx.qcDeductionThisMonth === 'number' && typeof ctx.qcDeductionBaseline === 'number' &&
      ctx.qcDeductionBaseline > 0 &&
      (ctx.qcDeductionThisMonth - ctx.qcDeductionBaseline) / ctx.qcDeductionBaseline >= QC_HIGH_DEDUCTION) {
    return 'qcDeductionHigh';
  }
  if (typeof ctx.outpatientToday === 'number' && typeof ctx.outpatientBaseline === 'number' &&
      ctx.outpatientBaseline > 0 &&
      (ctx.outpatientToday - ctx.outpatientBaseline) / ctx.outpatientBaseline >= OUTPATIENT_PEAK_DEVIATION) {
    return 'outpatientPeak';
  }
  // 演示兜底：门诊高峰
  return 'outpatientPeak';
}

export const SCENARIO_LABEL: Record<DecisionScenarioType, string> = {
  outpatientPeak: '门诊高峰',
  bedTight: '床位紧张',
  drugStockLow: '药品库存告急',
  qcDeductionHigh: '质控扣分超标',
};

// ---------------------------------------------------------------------------
// 候选项生成：四类场景的具体方案库（数字为演示基线，接入真实运营数据后可校准）
// ---------------------------------------------------------------------------

/** 生成某场景下的全部候选项（含收益分 benefitScore） */
export function buildScenarioOptions(scenario: DecisionScenarioType, ctx: DecisionContext): DecisionOption[] {
  switch (scenario) {
    case 'outpatientPeak': {
      const over = ctx.outpatientToday && ctx.outpatientBaseline
        ? Math.max(0, ctx.outpatientToday - ctx.outpatientBaseline)
        : 600;
      return [
        {
          optionId: 'opd_add_doctors',
          scenario,
          title: '增派门诊医生',
          action: `今日高峰时段（9:00-11:30）增派 2 名副高以上医生开专科门诊，预计分流约 ${Math.round(over * 0.35)} 人次`,
          rationale: '直接增加号源供给，是削峰最直接的手段；副高出诊可同时提升疑难病例当场确诊率。',
          costPerRun: 6000,
          benefit: { waitReductionMin: 20, bedRelief: 0, satisfactionGain: 4 },
          benefitScore: 88,
          riskLevel: 'medium',
          riskNote: '需医生当天可协调；临时出诊注意与病房排班冲突，避免一线人手被抽空。',
          effort: 'high',
          timeToEffectMin: 60,
        },
        {
          optionId: 'opd_open_windows',
          scenario,
          title: '开放备用收费/采血窗口',
          action: '启用 4 个备用服务窗口（缴费/采血/打印报告），高峰时段双岗运行',
          rationale: '排队瓶颈往往不在医生而在配套环节；开窗口边际成本低、见效最快。',
          costPerRun: 1800,
          benefit: { waitReductionMin: 12, satisfactionGain: 2 },
          benefitScore: 72,
          riskLevel: 'low',
          riskNote: '窗口人员需完成岗前再培训与叫号系统授权，注意高峰后及时恢复编制。',
          effort: 'medium',
          timeToEffectMin: 30,
        },
        {
          optionId: 'opd_guide_appointment',
          scenario,
          title: '引导错峰预约',
          action: '对当日溢出号源推送 App/短信「下午/明日预约」引导，同步开放夜间门诊号源',
          rationale: '不增加当日压力，把可延后的需求平移到低谷时段，长期平抑峰谷差。',
          costPerRun: 500,
          benefit: { waitReductionMin: 8, satisfactionGain: 3 },
          benefitScore: 60,
          riskLevel: 'low',
          riskNote: '仅对非急症患者引导；急症患者必须保留当日加号通道，不得强制预约。',
          effort: 'low',
          timeToEffectMin: 1440,
        },
      ];
    }

    case 'bedTight': {
      return [
        {
          optionId: 'bed_expedite_discharge',
          scenario,
          title: '加快符合出院条件患者出院',
          action: '床管中心联合医务处，对已达出院标准、待结算患者今日内完成出院，目标释放 8 张床',
          rationale: '不动编制、不增床位，靠流程挖潜；是床位紧张时首选、最安全的手段。',
          costPerRun: 800,
          benefit: { bedRelief: 8, satisfactionGain: 1 },
          benefitScore: 82,
          riskLevel: 'medium',
          riskNote: '必须由科主任逐床确认医学出院标准，严禁为腾床而过早出院；出院带药与随访同步到位。',
          effort: 'medium',
          timeToEffectMin: 480,
        },
        {
          optionId: 'bed_add_beds',
          scenario,
          title: '走廊加床',
          action: '在医生办公室/示教室临时增设 6 张观察床，配移动呼叫与氧气接口',
          rationale: '应急扩容量立竿见影，用于收治急诊滞留的待床患者。',
          costPerRun: 1500,
          benefit: { bedRelief: 6, satisfactionGain: -2 },
          benefitScore: 70,
          riskLevel: 'high',
          riskNote: '院感高风险（探视/动线/手卫生），加床不得用于术后监护与传染病患者；护士配比同步上调，超时即撤除。',
          effort: 'high',
          timeToEffectMin: 120,
        },
        {
          optionId: 'bed_transfer_rehab',
          scenario,
          title: '转康复/医联体机构',
          action: '筛选病情稳定、以康复护理为主的患者，转康复医院或医联体下级机构，目标分流 10 人',
          rationale: '把急性期床位还给急性期患者，分级诊疗政策明确支持，长期成本最低。',
          costPerRun: 0,
          benefit: { bedRelief: 10, satisfactionGain: 0 },
          benefitScore: 86,
          riskLevel: 'low',
          riskNote: '必须患方知情同意、交接记录完整；转出后 48 小时内回访，避免上下信息断档。',
          effort: 'medium',
          timeToEffectMin: 1440,
        },
      ];
    }

    case 'drugStockLow': {
      const days = ctx.drugStockDays ?? 3;
      const daily = ctx.drugDailyConsume ?? 20;
      const price = ctx.drugUnitPrice ?? 50;
      const needQty = Math.round(Math.max(0, 30 - days) * daily);
      return [
        {
          optionId: 'drug_urgent_purchase',
          scenario,
          title: '紧急采购补足库存',
          action: `启动应急采购通道，按 30 天用量补货约 ${needQty} 单位，预算约 ${Math.round(needQty * price)} 元`,
          rationale: '从根本上恢复库存深度，避免断药影响在院治疗；走应急流程 24~48 小时到货。',
          costPerRun: Math.round(needQty * price),
          benefit: { stockDaysRestored: 30 - days },
          benefitScore: 90,
          riskLevel: 'low',
          riskNote: '走应急采购审批与招投标例外条款，留痕可审计；到货后先验收入库再发药。',
          effort: 'medium',
          timeToEffectMin: 2880,
        },
        {
          optionId: 'drug_substitute',
          scenario,
          title: '启动同类替代药品',
          action: '由药剂科 + 临床药学评估同通用名/同治疗级别替代药，对在院患者换医嘱并告知',
          rationale: '不等采购到货，立刻保证治疗连续；适合急救与慢病长期用药场景。',
          costPerRun: 300,
          benefit: { stockDaysRestored: 15 },
          benefitScore: 68,
          riskLevel: 'medium',
          riskNote: '必须核对禁忌证与相互作用，特殊人群（孕哺/肝肾功异常）逐例审核；换用书面告知并签知情。',
          effort: 'medium',
          timeToEffectMin: 60,
        },
      ];
    }

    case 'qcDeductionHigh': {
      const dept = ctx.deptName ?? '全院';
      return [
        {
          optionId: 'qc_special_rectification',
          scenario,
          title: '质控问题专项整改',
          action: `针对 ${dept} 本月扣分项做根因复盘：抽 30 份缺陷病历逐条讲评，7 日内完成整改并复查`,
          rationale: '先找准扣分主因（编码/记录时效/知情告知）再动手，避免培训泛泛而谈。',
          costPerRun: 30000,
          benefit: { qcDeductionDrop: 12, satisfactionGain: 0 },
          benefitScore: 85,
          riskLevel: 'low',
          riskNote: '整改结果与绩效挂钩但不搞一次性罚款；缺陷病历不与当事人个人隐私对外公开。',
          effort: 'high',
          timeToEffectMin: 4320,
        },
        {
          optionId: 'qc_targeted_training',
          scenario,
          title: '靶向专题培训',
          action: '围绕扣分 TOP3 问题（如首页填写、三级查房记录）开 2 场 1.5 小时实操培训，当场考核',
          rationale: '低成本、可批量复制；与专项整改配套，短期止血、长期固化习惯。',
          costPerRun: 8000,
          benefit: { qcDeductionDrop: 6, satisfactionGain: 0 },
          benefitScore: 66,
          riskLevel: 'low',
          riskNote: '培训后 2 周抽考验证，未达标者补训；避免只签到不考核的形式主义。',
          effort: 'low',
          timeToEffectMin: 10080,
        },
      ];
    }
  }
}

// ---------------------------------------------------------------------------
// 纯函数 1：方案排序（rankDecisionOptions）
// ---------------------------------------------------------------------------

/**
 * 对候选项按四维加权打分：
 *  - 收益分 benefitScore（已在方案库中量化）
 *  - 成本分 = 100 - 成本相对最高项的占比 × 100（越便宜越高分）
 *  - 风险分 = 100 × (1 - 风险权重)
 *  - 速度分 = clamp(100 - 见效小时数 × 8)（1 天见效满分，7 天以上及格线）
 */
export function rankDecisionOptions(
  options: DecisionOption[],
  criteria: DecisionCriteria = DEFAULT_DECISION_CRITERIA,
): RankedOption[] {
  if (options.length === 0) return [];

  const maxCost = Math.max(...options.map((o) => o.costPerRun), 1);

  const scored = options.map((o) => {
    const costScore = 100 - (o.costPerRun / maxCost) * 100;
    const riskScore = 100 * (1 - RISK_WEIGHT[o.riskLevel]);
    const hours = o.timeToEffectMin / 60;
    const speedScore = Math.max(20, 100 - hours * 8);
    const effortPenalty = EFFORT_COST_FACTOR[o.effort] - 1; // 0 / 0.6 / 1.4
    const total =
      criteria.wBenefit * o.benefitScore +
      criteria.wCost * costScore +
      criteria.wRisk * riskScore +
      criteria.wSpeed * speedScore -
      effortPenalty * 10;
    return { o, total: round1(total) };
  });

  // 名次：分高者先，同分按投入低者先（确定性排序）
  scored.sort((a, b) => (b.total - a.total !== 0 ? b.total - a.total : a.o.costPerRun - b.o.costPerRun));

  return scored.map((s, i) => ({
    ...s.o,
    totalScore: s.total,
    rank: i + 1,
    recommended: i === 0,
  }));
}

// ---------------------------------------------------------------------------
// 纯函数 2：影响评估（estimateDecisionImpact）
// ---------------------------------------------------------------------------

/**
 * 把一个排序后的方案折算成可比较的投入产出：
 *  - 候诊每减少 1 分钟 ≈ 当日释放 15 人次接诊能力 × 人均收益 ¥8；
 *  - 每释放 1 张床 ≈ 当日多收 1.2 人次 × 均次收益 ¥600；
 *  - 库存恢复 1 天 ≈ 避免断药损失 ¥200；
 *  - 质控每挽回 1 分 ≈ 避免考核与病组损失 ¥1500。
 */
export function estimateDecisionImpact(decision: RankedOption | DecisionOption): DecisionImpact {
  const b = decision.benefit;
  let benefitValue = 0;
  if (b.waitReductionMin) benefitValue += b.waitReductionMin * 15 * 8;
  if (b.bedRelief) benefitValue += b.bedRelief * 1.2 * 600;
  if (b.stockDaysRestored) benefitValue += b.stockDaysRestored * 200;
  if (b.qcDeductionDrop) benefitValue += b.qcDeductionDrop * 1500;
  if (b.satisfactionGain) benefitValue += b.satisfactionGain * 100;

  const roi = decision.costPerRun > 0 ? round1(benefitValue / decision.costPerRun) : null;

  const caveats: string[] = [
    '本评估为数据中台演示口径，正式执行前需结合当日排班、库存与绩效实际校准。',
    decision.riskNote,
    '最终执行由当班院领导 / 科主任确认，系统仅提供辅助决策。',
  ];

  // 置信度：风险越低、见效越快，置信度越高
  const confidence = round1(
    clamp01(
      0.75 +
        (decision.riskLevel === 'low' ? 0.15 : decision.riskLevel === 'medium' ? 0.05 : -0.1) -
        Math.min(0.1, (decision.timeToEffectMin / 60 / 24) * 0.03),
    ),
  );

  return {
    optionId: decision.optionId,
    title: decision.title,
    estimatedCost: decision.costPerRun,
    estimatedBenefitValue: Math.round(benefitValue),
    roi,
    benefit: b,
    confidence,
    caveats,
  };
}

// ---------------------------------------------------------------------------
// 纯函数 3：效果跟踪（monitorDecisionOutcome）
// ---------------------------------------------------------------------------

/**
 * 事后闭环：拿「预测 vs 实际」算达成率与偏差，沉淀经验。
 * 纯函数：不写库，只产出一条可上报 / 可回灌到建议模型的结论。
 */
export function monitorDecisionOutcome(
  decisionId: string,
  outcome: DecisionOutcomeReport,
): DecisionOutcomeResult {
  const expectedAbs = Math.abs(outcome.expected);
  const actualAbs = Math.abs(outcome.actual);
  const achievedRatio = expectedAbs > 0 ? round2(Math.min(1, actualAbs / expectedAbs)) : 1;
  const deviationPct = expectedAbs > 0 ? round1(((outcome.actual - outcome.expected) / expectedAbs) * 100) : 0;

  const verdict: DecisionOutcomeResult['verdict'] =
    achievedRatio >= 0.9 ? 'achieved' : achievedRatio >= 0.5 ? 'partial' : 'missed';

  const costDeviationPct =
    outcome.costPlanned > 0
      ? round1(((outcome.costActual - outcome.costPlanned) / outcome.costPlanned) * 100)
      : null;

  let learning: string;
  let nextAction: string;
  if (verdict === 'achieved') {
    learning = `方案达到预期（实际 ${outcome.actual} vs 预测 ${outcome.expected}），该动作模板可在同类场景复用。`;
    nextAction = '纳入标准动作库，下次同类高峰直接推荐；并把本次收益折算回历史基线。';
  } else if (verdict === 'partial') {
    learning = `方案部分见效（达成率 ${achievedRatio}），收益被实际情况打了折，需排查瓶颈环节。`;
    nextAction = '复盘未达成部分的原因（排班/到岗/患者配合度），下次提高对应项的权重或加配套措施。';
  } else {
    learning = `方案未达预期（实际 ${outcome.actual} vs 预测 ${outcome.expected}），原假设不成立。`;
    nextAction = '下调该方案在该场景的收益分，检查候选项建模依据，避免重复推荐无效动作。';
  }

  return {
    decisionId,
    metric: outcome.metric,
    expected: outcome.expected,
    actual: outcome.actual,
    achievedRatio,
    deviationPct,
    verdict,
    costDeviationPct,
    learning,
    nextAction,
  };
}

// ---------------------------------------------------------------------------
// 纯函数 4：总装（buildAIDecisionSupport）
// ---------------------------------------------------------------------------

/** 构造确定性演示上下文（与 resourceOptimize 一致风格） */
export function buildDemoContext(): DecisionContext {
  return {
    scenario: 'outpatientPeak',
    hospital: { code: 'HZJL001', name: '杭州健澜示范医院' },
    outpatientToday: 3120, // 较基线 2400 高 30% → 门诊高峰
    outpatientBaseline: 2400,
    avgWaitMinutes: 46,
    bedRate: 88,
    pendingAdmissions: 9,
    drugStockDays: 3,
    drugDailyConsume: 24,
    drugUnitPrice: 45,
    qcDeductionThisMonth: 26,
    qcDeductionBaseline: 18,
    deptName: '内科',
  };
}

/** 由上下文生成触发事实文案 */
function buildTriggerFacts(scenario: DecisionScenarioType, ctx: DecisionContext): string[] {
  switch (scenario) {
    case 'outpatientPeak': {
      const base = ctx.outpatientBaseline ?? 2400;
      const today = ctx.outpatientToday ?? 3120;
      const dev = base > 0 ? round1(((today - base) / base) * 100) : 0;
      return [
        `今日门诊 ${today} 人次，较近 7 日均值 ${base} 人次偏高 ${dev}%（阈值 +20%）`,
        `当前平均候诊 ${ctx.avgWaitMinutes ?? 46} 分钟，已超出 30 分钟舒适线`,
      ];
    }
    case 'bedTight':
      return [
        `床位使用率 ${ctx.bedRate ?? 93}%（紧张阈值 ≥ ${BED_TIGHT_RATE}%）`,
        `待入院排队 ${ctx.pendingAdmissions ?? 9} 人，急诊留观待床压力上升`,
      ];
    case 'drugStockLow':
      return [
        `关键药品可售天数仅 ${ctx.drugStockDays ?? 3} 天（预警阈值 ≤ ${DRUG_LOW_STOCK_DAYS} 天）`,
        `日消耗 ${ctx.drugDailyConsume ?? 24} 单位，按当前库存约 ${ctx.drugStockDays ?? 3} 天后断药`,
      ];
    case 'qcDeductionHigh': {
      const base = ctx.qcDeductionBaseline ?? 18;
      const cur = ctx.qcDeductionThisMonth ?? 26;
      const dev = base > 0 ? round1(((cur - base) / base) * 100) : 0;
      return [
        `${ctx.deptName ?? '全院'} 本月质控扣分 ${cur} 分，近 3 月均值 ${base} 分，恶化 ${dev}%（阈值 +${QC_HIGH_DEDUCTION * 100}%）`,
        '扣分项集中在病历首页填写与三级查房记录时效',
      ];
    }
  }
}

/**
 * 总装：识别场景 → 生成候选项 → 加权排序 → 推荐第一并评估影响。
 * 纯函数：固定输入必得固定输出。
 */
export function buildAIDecisionSupport(context: DecisionContext): AIDecisionSupport {
  const ctx = context ?? {};
  const scenario = detectScenario(ctx);
  const hospital = ctx.hospital ?? { code: 'HZJL001', name: '杭州健澜示范医院' };

  const candidates = buildScenarioOptions(scenario, ctx);
  const ranked = rankDecisionOptions(candidates, DEFAULT_DECISION_CRITERIA);
  const recommended = ranked[0];
  const impact = estimateDecisionImpact(recommended);

  return {
    generatedAt: new Date().toISOString(),
    demo: true,
    hospital,
    scenario,
    scenarioLabel: SCENARIO_LABEL[scenario],
    triggerFacts: buildTriggerFacts(scenario, ctx),
    options: ranked,
    recommended,
    impact,
    notice:
      '演示数据：方案与收益为模型基线估算，正式执行须由当班院领导/科主任结合当日实际确认；系统仅作辅助决策。',
  };
}
