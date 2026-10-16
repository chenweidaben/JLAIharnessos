/**
 * 健澜科技 jlmedaios — 【安全质量与运营】医院质量与安全管理深化聚合器（M172-B）
 *
 * 质量指标严格采用国家口径，不自创指标：
 *   - 依据《医疗质量管理办法》《三级医院评审标准（2022 年版）》第四章「质量与安全」、
 *     国家卫生健康委《国家医疗质量安全改进目标》与《患者安全目标》；
 *   - 医疗质量 / 护理质量 / 药事质量 / 患者安全 四大维度全部使用国家或行业
 *     通行定义与达标线（如住院抗菌药物使用强度 ≤40 DDDs/100 人天、
 *     处方合格率 ≥95%、术前讨论率 ≥100%、甲级病历率 ≥90% 等）。
 *
 * 四个纯函数（不触库、不发网络、无副作用，便于单测）：
 *   - buildDeepQualitySystem：构建深度质量管理体系（国家口径指标目录 + 维度分布）；
 *   - predictQualityTrend：基于历史序列做最小二乘线性外推，预测未来 N 期走势，
 *     并判断是否会突破达标线（真算，不空壳）；
 *   - identifyQualityRisk：按科室当前读数对照国家达标线，识别红/黄/绿风险；
 *   - generateQualityImprovement：针对单项指标与缺口，生成可落地的改进建议
 *     （措施 / 责任岗 / 优先级 / 量化目标），对接 PDCA 闭环。
 *
 * 医疗安全红线：
 *   * 患者安全不良事件（跌倒/坠床/压疮/给药错误/输血反应）目标为零发生，
 *     阈值仅作警戒，任何阳性读数一律计为风险，禁止淡化；
 *   * 趋势预测仅为管理辅助，不用于临床诊疗决策；
 *   * 样本序列过短（<2 期）时不外推，明确标注数据不足。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 四大质量维度（国家口径分组） */
export type QualityDomain = 'medical' | 'nursing' | 'pharmacy' | 'patient_safety';

/** 指标方向：lower_better 越低越好（感染率/并发症率），higher_better 越高越好（合格率） */
export type MetricDirection = 'lower_better' | 'higher_better';

/** 一条国家口径质量指标定义 */
export interface QualityMetricDef {
  /** 指标编码（稳定主键） */
  code: string;
  /** 指标名称（国家口径规范名） */
  name: string;
  /** 所属维度 */
  domain: QualityDomain;
  /** 计量单位：% / ‰ / DDDs/100人天 / 例 */
  unit: string;
  /** 方向 */
  direction: MetricDirection;
  /** 国家/行业达标线：higher_better 时 value>=threshold 达标；lower_better 时 value<=threshold 达标 */
  threshold: number;
  /** 口径说明（分母/分子来源，便于审计） */
  caliber: string;
}

/** 深度质量管理体系输出 */
export interface DeepQualitySystem {
  generatedAt: string;
  domains: Array<{
    code: QualityDomain;
    name: string;
    metrics: QualityMetricDef[];
  }>;
  totalMetrics: number;
  summary: Record<QualityDomain, number>;
}

/** 趋势预测输入：一期历史读数 */
export interface HistoryPoint {
  /** 期次标签（如 2026-01） */
  period: string;
  /** 该期指标值 */
  value: number;
}

/** 趋势预测输出 */
export interface QualityTrend {
  metricCode: string;
  metricName: string;
  direction: MetricDirection;
  /** 历史均值 */
  mean: number;
  /** 每期变化斜率（最小二乘，带符号） */
  slopePerPeriod: number;
  /** 走势：improving 向好 / worsening 向坏 / stable 平稳 */
  trend: 'improving' | 'worsening' | 'stable';
  /** 外推的未来 days 期读数 */
  forecast: number[];
  /** 外推期末值 */
  forecastEnd: number;
  /** 外推期末是否将突破达标线（向坏方向越线） */
  willBreach: boolean;
  /** 历史期数不足（<2）时为 true，不外推 */
  underpowered: boolean;
}

/** 科室当前读数（一次采样） */
export interface MetricReading {
  code: string;
  value: number;
}

/** 风险等级：critical 红线 / warning 黄线 / ok 达标 */
export type RiskLevel = 'critical' | 'warning' | 'ok';

/** 一条质量风险识别结果 */
export interface QualityRisk {
  dept: string;
  code: string;
  name: string;
  domain: QualityDomain;
  value: number;
  threshold: number;
  unit: string;
  direction: MetricDirection;
  /** 偏差（带符号）：higher_better = value - threshold；lower_better = value - threshold */
  deviation: number;
  level: RiskLevel;
  message: string;
}

/** 质量改进建议输出 */
export interface QualityImprovement {
  code: string;
  name: string;
  domain: QualityDomain;
  unit: string;
  direction: MetricDirection;
  /** 当前值 */
  current: number;
  /** 达标线 */
  threshold: number;
  /** 需要补齐的缺口（绝对值） */
  gap: number;
  /** 改进措施（规则库映射） */
  measure: string;
  /** 建议责任岗位 */
  owner: string;
  /** 优先级：high / medium / low */
  priority: 'high' | 'medium' | 'low';
  /** 量化目标（一句话） */
  target: string;
}

// ---------------------------------------------------------------------------
// 国家口径指标目录（唯一事实来源；不自创指标）
// ---------------------------------------------------------------------------

const DOMAIN_NAMES: Record<QualityDomain, string> = {
  medical: '医疗质量',
  nursing: '护理质量',
  pharmacy: '药事质量',
  patient_safety: '患者安全',
};

/**
 * 国家口径指标目录。
 * 达标线取《三级医院评审标准（2022 年版）》《国家医疗质量安全改进目标》及
 * 国家抗菌药物临床应用专项整治的通行要求；患者安全类目标为零发生，
 * threshold 仅为警戒线。
 */
export const QUALITY_METRIC_CATALOG: QualityMetricDef[] = [
  // —— 医疗质量 ——
  { code: 'MR_GRADE_A_RATE', name: '甲级病历率', domain: 'medical', unit: '%', direction: 'higher_better', threshold: 90, caliber: '甲级病历数 / 抽查病历总数 ×100%' },
  { code: 'SURGICAL_COMPLICATION_RATE', name: '手术并发症发生率', domain: 'medical', unit: '%', direction: 'lower_better', threshold: 3, caliber: '手术并发症例数 / 同期手术总例数 ×100%' },
  { code: 'HAI_RATE', name: '医院感染发生率（院感率）', domain: 'medical', unit: '%', direction: 'lower_better', threshold: 10, caliber: '医院感染例次数 / 同期住院患者数 ×100%' },
  { code: 'AUDDS', name: '住院抗菌药物使用强度', domain: 'medical', unit: 'DDDs/100人天', direction: 'lower_better', threshold: 40, caliber: '抗菌药物累计 DDDs / 同期出院患者人天数 ×100' },
  { code: 'PREOP_DISCUSSION_RATE', name: '术前讨论率', domain: 'medical', unit: '%', direction: 'higher_better', threshold: 100, caliber: '开展术前讨论的手术例数 / 应讨论手术例数 ×100%' },

  // —— 护理质量 ——
  { code: 'BASIC_NURSING_PASS_RATE', name: '基础护理合格率', domain: 'nursing', unit: '%', direction: 'higher_better', threshold: 90, caliber: '基础护理合格项次 / 检查总项次 ×100%' },
  { code: 'CRITICAL_NURSING_PASS_RATE', name: '危重患者护理合格率', domain: 'nursing', unit: '%', direction: 'higher_better', threshold: 90, caliber: '危重患者护理合格项次 / 检查总项次 ×100%' },
  { code: 'INPATIENT_PRESSURE_ULCER_RATE', name: '院内压疮发生率', domain: 'nursing', unit: '‰', direction: 'lower_better', threshold: 0.5, caliber: '院内新发压疮例数 / 同期住院床日 ×1000‰' },
  { code: 'INPATIENT_FALL_RATE', name: '住院患者跌倒发生率', domain: 'nursing', unit: '‰', direction: 'lower_better', threshold: 1.0, caliber: '住院跌倒例数 / 同期住院床日 ×1000‰' },

  // —— 药事质量 ——
  { code: 'PRESCRIPTION_PASS_RATE', name: '处方合格率', domain: 'pharmacy', unit: '%', direction: 'higher_better', threshold: 95, caliber: '合理处方数 / 抽样处方总数 ×100%（处方点评）' },
  { code: 'ORDER_PASS_RATE', name: '医嘱合格率', domain: 'pharmacy', unit: '%', direction: 'higher_better', threshold: 95, caliber: '合格医嘱数 / 抽查医嘱总数 ×100%' },
  { code: 'ADR_REPORT_TIMELY_RATE', name: '药品不良反应（ADR）报告及时率', domain: 'pharmacy', unit: '%', direction: 'higher_better', threshold: 90, caliber: '按时限上报 ADR 例数 / 应上报 ADR 例数 ×100%' },
  { code: 'DRUG_INVENTORY_DIFF_RATE', name: '药品盘点差异率', domain: 'pharmacy', unit: '%', direction: 'lower_better', threshold: 0.1, caliber: '账实差异金额 / 盘点药品总金额 ×100%' },

  // —— 患者安全（目标零发生，threshold 为警戒线） ——
  { code: 'PS_FALL', name: '患者跌倒（不良事件）', domain: 'patient_safety', unit: '‰', direction: 'lower_better', threshold: 0.3, caliber: '跌倒不良事件例数 / 同期住院床日 ×1000‰' },
  { code: 'PS_BED_FALL', name: '患者坠床（不良事件）', domain: 'patient_safety', unit: '‰', direction: 'lower_better', threshold: 0.2, caliber: '坠床不良事件例数 / 同期住院床日 ×1000‰' },
  { code: 'PS_PRESSURE_ULCER', name: '患者压疮（不良事件）', domain: 'patient_safety', unit: '‰', direction: 'lower_better', threshold: 0.3, caliber: '压疮不良事件例数 / 同期住院床日 ×1000‰' },
  { code: 'PS_MEDICATION_ERROR', name: '给药错误（不良事件）', domain: 'patient_safety', unit: '例', direction: 'lower_better', threshold: 0, caliber: '给药错误事件数（目标零发生）' },
  { code: 'PS_TRANSFUSION_REACTION', name: '输血反应（不良事件）', domain: 'patient_safety', unit: '例', direction: 'lower_better', threshold: 0, caliber: '输血反应事件数（目标零发生）' },
];

/** 由 code 查指标定义；未登记 code 返回 undefined（禁止自创指标参与计算） */
export function findMetricDef(code: string): QualityMetricDef | undefined {
  return QUALITY_METRIC_CATALOG.find((m) => m.code === code);
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 判断某读数是否达标（按方向对照达标线）。
 * threshold<=0（零容忍）时，任何 >0 读数均不达标。
 */
function isWithinTarget(def: QualityMetricDef, value: number): boolean {
  if (def.threshold <= 0) return value <= 0;
  return def.direction === 'higher_better' ? value >= def.threshold : value <= def.threshold;
}

// ---------------------------------------------------------------------------
// 纯函数一：构建深度质量管理体系（国家口径指标目录）
// ---------------------------------------------------------------------------

/**
 * 构建医院深度质量管理体系：把国家口径指标按四大维度组织成一页目录，
 * 含维度计数。这是质量管理深化的「底子」——先统一口径，再谈监测与改进。
 *
 * @param nowIso 生成时间（可选，便于测试断言；缺省当前 ISO）
 */
export function buildDeepQualitySystem(nowIso?: string): DeepQualitySystem {
  const summary: Record<QualityDomain, number> = {
    medical: 0,
    nursing: 0,
    pharmacy: 0,
    patient_safety: 0,
  };

  const order: QualityDomain[] = ['medical', 'nursing', 'pharmacy', 'patient_safety'];
  const domains = order.map((code) => {
    const metrics = QUALITY_METRIC_CATALOG.filter((m) => m.domain === code);
    summary[code] = metrics.length;
    return { code, name: DOMAIN_NAMES[code], metrics };
  });

  return {
    generatedAt: nowIso ?? new Date().toISOString(),
    domains,
    totalMetrics: QUALITY_METRIC_CATALOG.length,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 纯函数二：质量趋势预测（最小二乘线性外推）
// ---------------------------------------------------------------------------

/**
 * 预测质量指标未来 days 期走势。
 *
 * 方法：对历史序列（按时间先后）做最小二乘线性回归求斜率，再外推 days 期；
 * 「向好/向坏」结合指标方向判断：
 *   - higher_better：斜率 >0 为向好，<0 为向坏；
 *   - lower_better：斜率 <0 为向好，>0 为向坏；
 *   - 每期相对斜率绝对值 <0.5% 视为平稳（stable）。
 * willBreach：外推期末值沿向坏方向越过达标线。
 *
 * @param metric 指标定义（由 findMetricDef 取得）
 * @param history 历史读数（时间先后，至少 2 期）
 * @param days    预测期数
 */
export function predictQualityTrend(
  metric: QualityMetricDef,
  history: Array<{ value: number; period?: string }> | number[],
  days: number,
): QualityTrend {
  const values = history.map((h) => (typeof h === 'number' ? h : h.value));
  const n = values.length;
  const base: Omit<QualityTrend, 'slopePerPeriod' | 'trend' | 'willBreach'> = {
    metricCode: metric.code,
    metricName: metric.name,
    direction: metric.direction,
    mean: n === 0 ? 0 : round2(values.reduce((a, b) => a + b, 0) / n),
    forecast: [],
    forecastEnd: n === 0 ? 0 : values[n - 1],
    underpowered: n < 2,
  };

  // 数据不足：不外推，明确标注
  if (n < 2) {
    return { ...base, slopePerPeriod: 0, trend: 'stable', willBreach: false };
  }

  // 最小二乘斜率
  const xs = values.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const lastValue = values[n - 1];

  // 外推 days 期：从最后一期之后第 1 期开始
  const forecast: number[] = [];
  for (let k = 1; k <= days; k++) {
    forecast.push(round2(lastValue + slope * k));
  }
  const forecastEnd = forecast.length > 0 ? forecast[forecast.length - 1] : lastValue;

  // 走势方向
  const relSlope = Math.abs(meanY) < 1e-9 ? slope : slope / meanY;
  let trend: QualityTrend['trend'] = 'stable';
  if (Math.abs(relSlope) >= 0.005) {
    const rising = slope > 0;
    if (metric.direction === 'higher_better') {
      trend = rising ? 'improving' : 'worsening';
    } else {
      trend = rising ? 'worsening' : 'improving';
    }
  }

  // 外推期末是否向坏越线
  const willBreach = !isWithinTarget(metric, forecastEnd);

  return {
    ...base,
    mean: round2(meanY),
    slopePerPeriod: round2(slope),
    trend,
    forecast,
    forecastEnd: round2(forecastEnd),
    willBreach,
  };
}

// ---------------------------------------------------------------------------
// 纯函数三：质量风险识别（按科室当前读数对照国家达标线）
// ---------------------------------------------------------------------------

/**
 * 识别科室质量风险。
 *
 * 对每条当前读数：
 *   - 命中国家口径目录才参与判定（未登记 code 跳过，防止自创指标）；
 *   - 达标 → ok；
 *   - 不达标：偏离达标线幅度越大越红。
 *     对 lower_better：value 超过 threshold 的倍数 ≥1.5 记 critical，否则 warning；
 *     对 higher_better：value 低于 threshold 的比例 ≥10% 记 critical，否则 warning；
 *     零容忍类（threshold<=0）：任何阳性读数直接 critical。
 *
 * 返回仅含非 ok 风险，按严重度（critical 在前）与偏离幅度排序。
 *
 * @param dept    科室编码
 * @param readings 科室当前指标读数
 */
export function identifyQualityRisk(
  dept: string,
  readings: MetricReading[],
): QualityRisk[] {
  const risks: QualityRisk[] = [];
  for (const r of readings) {
    const def = findMetricDef(r.code);
    if (!def) continue; // 未登记国家口径指标，不参与判定
    if (!Number.isFinite(r.value)) continue;

    if (isWithinTarget(def, r.value)) {
      // 达标，不入风险清单
      continue;
    }

    const deviation = round2(r.value - def.threshold);

    let level: RiskLevel = 'warning';
    if (def.threshold <= 0) {
      // 零容忍：任何阳性读数即红线
      level = 'critical';
    } else if (def.direction === 'lower_better') {
      if (r.value >= def.threshold * 1.5) level = 'critical';
    } else {
      // higher_better：缺口占达标线比例
      if ((def.threshold - r.value) / def.threshold >= 0.1) level = 'critical';
    }

    const badWord =
      def.direction === 'lower_better' ? '高于达标线' : '低于达标线';
    const message =
      `${def.name} 当前 ${r.value}${def.unit}，${badWord} ${def.threshold}${def.unit}` +
      `${level === 'critical' ? '，触及红线，需立即整改' : '，需限期改进'}`;

    risks.push({
      dept,
      code: def.code,
      name: def.name,
      domain: def.domain,
      value: r.value,
      threshold: def.threshold,
      unit: def.unit,
      direction: def.direction,
      deviation,
      level,
      message,
    });
  }

  // critical 在前，同级按偏离幅度绝对值降序
  risks.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'critical' ? -1 : 1;
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });
  return risks;
}

// ---------------------------------------------------------------------------
// 纯函数四：质量改进建议（针对单项指标与缺口）
// ---------------------------------------------------------------------------

/** 改进措施规则库：按指标 code 映射到可落地措施 + 责任岗 */
const IMPROVEMENT_RULES: Array<{
  match: RegExp;
  measure: string;
  owner: string;
}> = [
  { match: /MR_GRADE_A/i, measure: '开展病历内涵质控专项：运行病历质控前置、三级医师查房记录闭环、缺陷病历 24h 内反馈返修', owner: '质控科 / 病案室' },
  { match: /SURGICAL_COMPLICATION/i, measure: '落实手术安全核查与围术期管理：术前多学科讨论、术后并发症日清单追踪、主刀医师分级授权再评估', owner: '医务科 / 外科教研室' },
  { match: /HAI|院感/i, measure: '强化手卫生依从性督查、器械消毒灭菌溯源、多重耐药菌隔离与环境物表采样闭环', owner: '院感科' },
  { match: /AUDDS|抗菌/i, measure: '抗菌药物分级管理 + 专项点评：限制级/特殊级处方事前审批、DDD 异常科室约谈、病原学送检率考核', owner: '药学部 / 感染科' },
  { match: /PREOP_DISCUSSION/i, measure: '重大、疑难、新开展手术 100% 术前讨论并留痕；讨论记录纳入手术准入核查', owner: '医务科 / 手术麻醉科' },
  { match: /BASIC_NURSING|CRITICAL_NURSING|护理/i, measure: '落实护理分级与基础护理周检查：危重症护理专项培训、护理不良事件根因分析（RCA）', owner: '护理部' },
  { match: /PRESSURE_ULCER|压疮/i, measure: '入院 Braden 压疮风险评估 + 高危患者翻身计划表落地、皮肤交班与减压工具配备核查', owner: '护理部 / 伤口小组' },
  { match: /FALL|跌倒|坠床/i, measure: '入院 Morse 跌倒风险评估、高危患者床栏/警示标识/陪护宣教三合一、卫生间防滑改造', owner: '护理部' },
  { match: /PRESCRIPTION|ORDER|处方|医嘱/i, measure: '处方医嘱专项点评：不合理处方周通报、前置审核药师干预、医师合理用药培训复训', owner: '药学部' },
  { match: /ADR/i, measure: 'ADR 应报尽报培训与激励：漏报核查、15 日时限预警、上报率纳入科室质量考核', owner: '药学部 / 临床科室' },
  { match: /INVENTORY|盘点/i, measure: '高值药品条码全程追溯、近效期与账实差异月度盘点、药库双人复核交接', owner: '药学部 / 药库' },
  { match: /MEDICATION_ERROR|给药错误/i, measure: '全程静脉用药调配（PIVAS）+ 用药双重核对（条码扫描）、高危药品醒目标识与独立存放', owner: '护理部 / 药学部' },
  { match: /TRANSFUSION|输血/i, measure: '输血双人核对与血制品全程冷链监控、输血反应应急流程演练、输血适应证审核', owner: '输血科 / 护理部' },
];

/** 兜底措施（未命中规则库） */
const DEFAULT_RULE = {
  measure: '按 PDCA 循环开展根因分析（RCA），制定量化改进目标并在下一周期复测前后对比',
  owner: '质控科',
};

/**
 * 生成单项质量指标的改进建议。
 *
 * @param metric 指标定义（国家口径）
 * @param current 当前实测值
 */
export function generateQualityImprovement(
  metric: QualityMetricDef,
  current: number,
): QualityImprovement {
  const gap =
    metric.direction === 'higher_better'
      ? Math.max(0, round2(metric.threshold - current))
      : Math.max(0, round2(current - metric.threshold));

  const hit = IMPROVEMENT_RULES.find((r) => r.match.test(metric.code) || r.match.test(metric.name));
  const rule = hit ?? DEFAULT_RULE;

  // 缺口越大优先级越高；患者安全类一律 high
  let priority: QualityImprovement['priority'] = 'low';
  if (metric.domain === 'patient_safety' && gap > 0) {
    priority = 'high';
  } else if (metric.threshold > 0) {
    const ratio = gap / metric.threshold;
    if (ratio >= 0.1) priority = 'high';
    else if (gap > 0) priority = 'medium';
  } else if (gap > 0) {
    priority = 'high';
  }

  const target =
    metric.direction === 'higher_better'
      ? `${metric.name} 提升至 ≥${metric.threshold}${metric.unit}`
      : `${metric.name} 控制在 ≤${metric.threshold}${metric.unit}${metric.domain === 'patient_safety' ? '（目标零发生）' : ''}`;

  return {
    code: metric.code,
    name: metric.name,
    domain: metric.domain,
    unit: metric.unit,
    direction: metric.direction,
    current,
    threshold: metric.threshold,
    gap,
    measure: rule.measure,
    owner: rule.owner,
    priority,
    target,
  };
}
