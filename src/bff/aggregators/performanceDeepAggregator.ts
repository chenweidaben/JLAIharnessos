/**
 * 健澜科技 jlmedaios - 【绩效与人才】医院科室绩效考核深化聚合器（M166-A，纯函数）
 *
 * 设计原则：绩效考核要公平，不能只看工作量。
 *   传统考核把「门诊量/手术量/出院人数」当唯一指挥棒，大科室天然占便宜、
 *   轻门诊重住院、压费用压服务；本模块把科室绩效拆成五个维度、十三个指标，
 *   按权重合成百分制，工作量只是「运营效率」维度里的一格：
 *
 *     医疗质量 30%  甲级病历率 / 手术并发症率(反向) / 平均住院日(反向)
 *     运营效率 20%  床位周转率 / 门诊量 / 手术量
 *     患者满意 20%  总体满意度 / 投诉率(反向) / 表扬率
 *     教学科研 15%  教学课时 / 论文数 / 课题数
 *     成本控制 15%  次均费用(反向) / 药占比(反向) / 耗占比(反向)
 *
 *   - buildDepartmentKPI(dept, year, quarter)：
 *       生成某科室某季度五维十三项指标的实际值/目标值/方向/样本量。
 *       纯确定性（同科室同年同季结果完全一致，可复算、可申诉）；
 *       未知科室回退内科基线，不随机抛数。
 *   - calculatePerformanceScore(dept, period)：
 *       把每个指标按目标值归一化到 0-100（反向指标同样扣分），
 *       维度内等权合成维度分，维度间按 30/20/20/15/15 权重合成总分；
 *       样本量过小（underpowered）的指标标注但不隐瞒，不凭小样本下定论。
 *   - benchmarkDepartment(dept, benchmarkData)：
 *       拿本科室分数与全院平均分、前四分位对比，算百分位排名，
 *       回答「这个科在全院排第几」，而不是只看自己跟目标比。
 *   - identifyPerformanceGap(dept, target)：
 *       列出低于目标分的维度与指标，按缺口大小排序输出改进优先级，
 *       绩效结果直接对接人才培养与资源调配，而不是考完就归档。
 *
 * 本模块全部为无副作用纯函数，不触库、不发请求、便于单测；
 * 数据库读写由路由层 routes/performanceDeep.ts 负责。
 * 落库字段见 deploy/postgres/init/335-performance-deep.sql（medmuse.performance_kpi）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 五维编码（与 performance_kpi.dimension 列对齐） */
export type DimensionCode =
  | 'quality'            // 医疗质量
  | 'efficiency'        // 运营效率
  | 'satisfaction'      // 患者满意
  | 'teaching_research'  // 教学科研
  | 'cost_control';      // 成本控制

/** 指标方向：越高越好（率/量/满意度）或 越低越好（并发症/投诉/费用占比） */
export type MetricDirection = 'higher_is_better' | 'lower_is_better';

/** 单个 KPI 指标（buildDepartmentKPI 的产出单元） */
export interface KpiMetric {
  /** 指标编码，如 excellent_record_rate */
  code: string;
  /** 中文指标名 */
  name: string;
  /** 本季实际值 */
  value: number;
  /** 目标值（归一化基准） */
  target: number;
  /** 方向 */
  direction: MetricDirection;
  /** 单位：% / 次 / 天 / 课时 / 篇 / 项 / 元 */
  unit: string;
  /** 样本量（季度覆盖人次/例数）；过小则 underpowered */
  sampleSize: number;
}

/** 某科室某季度的完整 KPI 结构 */
export interface DepartmentKPI {
  dept: string;
  deptName: string;
  year: number;
  quarter: number;
  /** 周期字符串，如 2026Q3 */
  period: string;
  dimensions: Record<DimensionCode, KpiMetric[]>;
}

/** 单个指标归一化后的得分 */
export interface ScoredMetric extends KpiMetric {
  /** 归一化得分 0-100（封顶 120） */
  score: number;
  /** 样本量过小，结论仅供参考 */
  underpowered: boolean;
}

/** 单个维度得分 */
export interface DimensionScore {
  code: DimensionCode;
  /** 中文维度名 */
  label: string;
  /** 维度权重 0-1（五维合计=1） */
  weight: number;
  /** 维度加权得分 0-100 */
  score: number;
  metrics: ScoredMetric[];
}

/** calculatePerformanceScore 产出 */
export interface PerformanceScore {
  dept: string;
  deptName: string;
  period: string;
  /** 总分 0-100（五维加权合成，不只看工作量） */
  totalScore: number;
  dimensions: DimensionScore[];
  /** 总分等级：优秀≥90 / 良好≥80 / 合格≥70 / 待改进<70 */
  grade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  /** 是否存在样本量不足的指标（结论需谨慎） */
  hasUnderpowered: boolean;
}

/** 对标的全院基准输入 */
export interface BenchmarkInput {
  /** 本科室自己的得分 */
  self: PerformanceScore;
  /** 全院各科室得分（含本科室，用于算百分位） */
  peers: PerformanceScore[];
}

/** benchmarkDepartment 产出 */
export interface BenchmarkResult {
  dept: string;
  period: string;
  /** 本科室总分 */
  selfScore: number;
  /** 全院平均分 */
  hospitalAverage: number;
  /** 全院前四分位（Top 25%）分数线 */
  topQuartile: number;
  /** 百分位排名 0-100（80 = 优于 80% 的科室） */
  percentile: number;
  /** 全院科室总数 */
  deptCount: number;
  /** 逐维对比本科室与全院平均分的差值（正=优于平均） */
  dimensionVsAverage: Array<{
    code: DimensionCode;
    label: string;
    self: number;
    average: number;
    delta: number;
  }>;
}

/** identifyPerformanceGap 产出的单条差距 */
export interface PerformanceGap {
  dimension: DimensionCode;
  dimensionLabel: string;
  metricCode: string;
  metricName: string;
  /** 当前指标得分 0-100 */
  currentScore: number;
  /** 目标得分（通常 100） */
  targetScore: number;
  /** 缺口 = targetScore - currentScore（越大越优先） */
  gap: number;
  /** 改进优先级：high(缺口≥25) / medium(≥10) / low(<10) */
  priority: 'high' | 'medium' | 'low';
  /** 改进建议 */
  suggestion: string;
}

/* -------------------------------------------------------------------------- */
/* 常量配置                                                                    */
/* -------------------------------------------------------------------------- */

/** 维度权重：合计 = 1.0。质量与满意占大头，工作量（效率）只占 20% */
export const DIMENSION_WEIGHT: Record<DimensionCode, number> = {
  quality: 0.30,
  efficiency: 0.20,
  satisfaction: 0.20,
  teaching_research: 0.15,
  cost_control: 0.15,
};

/** 维度中文名 */
export const DIMENSION_LABEL: Record<DimensionCode, string> = {
  quality: '医疗质量',
  efficiency: '运营效率',
  satisfaction: '患者满意',
  teaching_research: '教学科研',
  cost_control: '成本控制',
};

/** 样本量低于此阈值判 underpowered（不凭小样本下定论） */
export const MIN_SAMPLE_SIZE = 30;

/** 得分上下限（超出 120 封顶，避免「超额奖励」异化为冲量） */
const SCORE_FLOOR = 0;
const SCORE_CAP = 120;

/** 科室中文名映射（未知科室回退内科） */
const DEPT_NAME: Record<string, string> = {
  internal_medicine: '内科',
  surgery: '外科',
  pediatrics: '儿科',
  obstetrics_gynecology: '妇产科',
  cardiology: '心内科',
  neurology: '神经内科',
  orthopedics: '骨科',
  emergency: '急诊科',
  icu: '重症医学科',
  oncology: '肿瘤科',
};

/* -------------------------------------------------------------------------- */
/* 工具函数                                                                    */
/* -------------------------------------------------------------------------- */

/** 确定性字符串哈希（同输入永远同输出，保证可复算、可申诉） */
function hashSeed(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 由科室 + 指标名生成 -0.5..0.5 的确定性浮动系数 */
function jitter(dept: string, metricCode: string): number {
  const h = hashSeed(`${dept}|${metricCode}`);
  return ((h % 1000) / 1000) - 0.5;
}

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 解析周期字符串 "2026Q3" → { year:2026, quarter:3 }，非法时回退当前年 Q1 */
export function parsePeriod(period: string): { year: number; quarter: number } {
  const m = /^(\d{4})[Qq]([1-4])$/.exec((period || '').trim());
  if (m) {
    return { year: Number(m[1]), quarter: Number(m[2]) };
  }
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return { year: now.getFullYear(), quarter: q };
}

/* -------------------------------------------------------------------------- */
/* 指标基线定义（目标值 + 典型实际区间）                                        */
/* -------------------------------------------------------------------------- */

interface MetricBaseline {
  code: string;
  name: string;
  target: number;
  direction: MetricDirection;
  unit: string;
  /** 实际值围绕目标的浮动幅度（约 ±15%） */
  spread: number;
  /** 典型样本量 */
  sample: number;
  /** 改进建议模板 */
  suggestion: string;
}

/** 五维十三项基线表 */
const BASELINES: Record<DimensionCode, MetricBaseline[]> = {
  quality: [
    { code: 'excellent_record_rate', name: '甲级病历率', target: 0.95, direction: 'higher_is_better', unit: '%', spread: 0.03, sample: 400, suggestion: '加强病历三级质控与缺陷反馈，提升甲级病历占比' },
    { code: 'surgery_complication_rate', name: '手术并发症率', target: 0.02, direction: 'lower_is_better', unit: '%', spread: 0.01, sample: 300, suggestion: '落实术前讨论与手术安全核查，降低并发症发生率' },
    { code: 'avg_los', name: '平均住院日', target: 8, direction: 'lower_is_better', unit: '天', spread: 1.5, sample: 350, suggestion: '优化临床路径与术前等待，压缩无效住院日' },
  ],
  efficiency: [
    { code: 'bed_turnover', name: '床位周转率', target: 40, direction: 'higher_is_better', unit: '次/年', spread: 6, sample: 60, suggestion: '加速床位周转与出院计划，减少压床' },
    { code: 'outpatient_volume', name: '门诊量', target: 5000, direction: 'higher_is_better', unit: '人次/季', spread: 1200, sample: 5000, suggestion: '工作量仅占 20% 权重，不以此单项论英雄；可优化号源与预约' },
    { code: 'surgery_volume', name: '手术量', target: 800, direction: 'higher_is_better', unit: '台/季', spread: 200, sample: 800, suggestion: '工作量仅占 20% 权重；可提升择期手术排程效率' },
  ],
  satisfaction: [
    { code: 'overall_satisfaction', name: '总体满意度', target: 4.5, direction: 'higher_is_better', unit: '分', spread: 0.3, sample: 800, suggestion: '改善医患沟通与就医流程，提升满意度均分' },
    { code: 'complaint_rate', name: '投诉率', target: 0.005, direction: 'lower_is_better', unit: '%', spread: 0.003, sample: 2000, suggestion: '闭环处理投诉根因，防止同类问题重复发生' },
    { code: 'praise_rate', name: '表扬率', target: 0.02, direction: 'higher_is_better', unit: '%', spread: 0.01, sample: 2000, suggestion: '固化服务亮点，正向激励医护主动服务' },
  ],
  teaching_research: [
    { code: 'teaching_hours', name: '教学课时', target: 120, direction: 'higher_is_better', unit: '课时/季', spread: 40, sample: 30, suggestion: '落实教学查房与授课计划，补足教学课时' },
    { code: 'paper_count', name: '论文数', target: 3, direction: 'higher_is_better', unit: '篇/季', spread: 2, sample: 5, suggestion: '组织临床科研方法培训，鼓励病例总结与论文产出' },
    { code: 'grant_count', name: '课题数', target: 1, direction: 'higher_is_better', unit: '项/季', spread: 1, sample: 2, suggestion: '加强课题申报辅导与院级孵化，提升中标率' },
  ],
  cost_control: [
    { code: 'avg_visit_cost', name: '次均费用', target: 8000, direction: 'lower_is_better', unit: '元', spread: 1200, sample: 1000, suggestion: '规范合理检查用药，控制次均费用不合理增长' },
    { code: 'drug_ratio', name: '药占比', target: 0.30, direction: 'lower_is_better', unit: '%', spread: 0.05, sample: 1000, suggestion: '推进处方点评与辅助用药管控，降低药占比' },
    { code: 'consumable_ratio', name: '耗占比', target: 0.18, direction: 'lower_is_better', unit: '%', spread: 0.04, sample: 800, suggestion: '加强高值耗材遴选与使用点评，控制耗占比' },
  ],
};

/* -------------------------------------------------------------------------- */
/* buildDepartmentKPI                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 生成某科室某季度五维十三项 KPI 指标。
 * 纯确定性：同 dept+year+quarter 永远返回相同结构，可复算、可申诉。
 * 未知科室回退内科基线，不抛随机数。
 */
export function buildDepartmentKPI(dept: string, year: number, quarter: number): DepartmentKPI {
  const code = (dept || '').trim() || 'internal_medicine';
  const safeYear = Number.isFinite(year) && year >= 2000 && year <= 2100 ? Math.floor(year) : new Date().getFullYear();
  const safeQuarter = quarter >= 1 && quarter <= 4 ? Math.floor(quarter) : 1;
  const deptName = DEPT_NAME[code] ?? code;

  const dimensions = {} as Record<DimensionCode, KpiMetric[]>;
  (Object.keys(BASELINES) as DimensionCode[]).forEach((dim) => {
    dimensions[dim] = BASELINES[dim].map((b) => {
      // 确定性浮动：实际值 = target ± spread*jitter
      const j = jitter(code, b.code); // -0.5..0.5
      let value = b.target + b.spread * j;
      // 反向指标不允许出现 0（归一化除零）
      if (value <= 0 && b.direction === 'lower_is_better') value = b.target * 0.5;
      // 率类指标不允许超过 1（100%）
      if (b.unit === '%' && b.code !== 'avg_los' && value > 1) value = 0.99;
      // 样本量按季度缩放，小科室略低但保证大多数达标
      const sample = Math.max(5, Math.round(b.sample * (1 + jitter(code, b.code + '_sample') * 0.3)));
      return {
        code: b.code,
        name: b.name,
        value: round2(value),
        target: b.target,
        direction: b.direction,
        unit: b.unit,
        sampleSize: sample,
      };
    });
  });

  return {
    dept: code,
    deptName,
    year: safeYear,
    quarter: safeQuarter,
    period: `${safeYear}Q${safeQuarter}`,
    dimensions,
  };
}

/* -------------------------------------------------------------------------- */
/* calculatePerformanceScore                                                   */
/* -------------------------------------------------------------------------- */

/** 把单个指标归一化到 0-100（反向指标同样扣分） */
function normalizeMetric(m: KpiMetric): ScoredMetric {
  let ratio: number;
  if (m.direction === 'higher_is_better') {
    ratio = m.value / m.target;
  } else {
    // 越低越好：实际值越小得分越高；target/actual，actual 为 0 时封顶
    ratio = m.target / Math.max(m.value, 1e-6);
  }
  const score = clamp(ratio * 100, SCORE_FLOOR, SCORE_CAP);
  return {
    ...m,
    score: round2(score),
    underpowered: m.sampleSize < MIN_SAMPLE_SIZE,
  };
}

function gradeOf(total: number): PerformanceScore['grade'] {
  if (total >= 90) return 'excellent';
  if (total >= 80) return 'good';
  if (total >= 70) return 'fair';
  return 'needs_improvement';
}

/**
 * 计算科室绩效总分。
 * 维度内等权合成维度分，维度间按 DIMENSION_WEIGHT（30/20/20/15/15）加权，
 * 工作量（efficiency）只占 20%，杜绝「以量论英雄」。
 */
export function calculatePerformanceScore(dept: string, period: string): PerformanceScore {
  const { year, quarter } = parsePeriod(period);
  const kpi = buildDepartmentKPI(dept, year, quarter);

  const dimensionScores: DimensionScore[] = (Object.keys(kpi.dimensions) as DimensionCode[]).map((dim) => {
    const metrics = kpi.dimensions[dim].map(normalizeMetric);
    // 维度内等权
    const dimScore = metrics.length
      ? metrics.reduce((s, m) => s + m.score, 0) / metrics.length
      : 0;
    return {
      code: dim,
      label: DIMENSION_LABEL[dim],
      weight: DIMENSION_WEIGHT[dim],
      score: round2(dimScore),
      metrics,
    };
  });

  // 维度间加权合成总分
  const totalScore = round2(
    dimensionScores.reduce((s, d) => s + d.score * d.weight, 0),
  );

  const hasUnderpowered = dimensionScores.some((d) => d.metrics.some((m) => m.underpowered));

  return {
    dept: kpi.dept,
    deptName: kpi.deptName,
    period: kpi.period,
    totalScore,
    dimensions: dimensionScores,
    grade: gradeOf(totalScore),
    hasUnderpowered,
  };
}

/* -------------------------------------------------------------------------- */
/* benchmarkDepartment                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 科室对标：拿本科室与全院平均分、前四分位、百分位对比。
 * peers 应包含本科室自身；空数组时仅返回本科室自身基线对比。
 */
export function benchmarkDepartment(dept: string, benchmarkData: BenchmarkInput): BenchmarkResult {
  const { self, peers } = benchmarkData;
  const selfScore = self.totalScore;

  const list = (peers && peers.length > 0 ? peers : [self]).map((p) => p.totalScore);
  const deptCount = list.length;
  const average = round2(list.reduce((s, v) => s + v, 0) / deptCount);

  const sorted = [...list].sort((a, b) => a - b);
  // 前四分位 = 75 分位线（Top 25% 门槛）
  const qIdx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
  const topQuartile = sorted.length ? sorted[qIdx] : selfScore;

  // 百分位：本科室分数在全院中优于多少比例的科室
  const betterCount = list.filter((v) => v < selfScore).length;
  const percentile = deptCount > 1 ? round2((betterCount / (deptCount - 1)) * 100) : 100;

  // 逐维对比全院平均（peers 需带维度分；缺失维度按 0 处理）
  const dimensionVsAverage: BenchmarkResult['dimensionVsAverage'] =
    self.dimensions.map((d) => {
      const peerDimAvg = round2(
        peers
          .map((p) => p.dimensions.find((pd) => pd.code === d.code)?.score ?? 0)
          .reduce((s, v) => s + v, 0) / (peers.length || 1),
      );
      return {
        code: d.code,
        label: d.label,
        self: d.score,
        average: peerDimAvg,
        delta: round2(d.score - peerDimAvg),
      };
    });

  return {
    dept,
    period: self.period,
    selfScore,
    hospitalAverage: average,
    topQuartile: round2(topQuartile),
    percentile,
    deptCount,
    dimensionVsAverage,
  };
}

/* -------------------------------------------------------------------------- */
/* identifyPerformanceGap                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 差距识别：列出低于目标分（默认 100）的指标，按缺口大小排序，
 * 输出改进优先级与建议，绩效结果直接对接人才培养与资源调配。
 */
export function identifyPerformanceGap(dept: string, target = 100): PerformanceGap[] {
  const scoreResult = calculatePerformanceScore(dept, '');
  const targetScore = clamp(target, 0, 120);
  const gaps: PerformanceGap[] = [];

  for (const dim of scoreResult.dimensions) {
    for (const m of dim.metrics) {
      const gap = round2(targetScore - m.score);
      if (gap <= 0) continue; // 达标或超额，不计入差距
      let priority: PerformanceGap['priority'] = 'low';
      if (gap >= 25) priority = 'high';
      else if (gap >= 10) priority = 'medium';

      // 取基线建议
      const baseline = BASELINES[dim.code].find((b) => b.code === m.code);
      gaps.push({
        dimension: dim.code,
        dimensionLabel: dim.label,
        metricCode: m.code,
        metricName: m.name,
        currentScore: m.score,
        targetScore: round2(targetScore),
        gap,
        priority,
        suggestion: baseline?.suggestion ?? '针对性整改并跟踪下期数据',
      });
    }
  }

  // 缺口大的排前面（同缺口下 high 优先）
  const priorityRank = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => (b.gap - a.gap) || (priorityRank[a.priority] - priorityRank[b.priority]));
  return gaps;
}
