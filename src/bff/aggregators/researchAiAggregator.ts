/**
 * 健澜科技 jlmedaios - 【集团与科研】医学科研智能化聚合器（M156-C）
 *
 * 纯函数三件套（不碰 IO / 不读时钟，便于单测精确复算）：
 *  1. smartCaseSearch      —— 病例智能检索：疾病+时间范围 / 年龄+性别 /
 *                             检查+检验指标 / 治疗方案+预后，多条件 AND 收敛；
 *  2. autoStatisticalAnalysis —— 自动统计：描述性统计（均值/中位数/标准差/率）、
 *                             两独立样本 Welch t 检验、列联表卡方检验、
 *                             Kaplan-Meier 生存分析，并自动生成统计表格；
 *  3. generateResearchReport —— 由项目 ID 与上述产物自动装配科研报告。
 *
 * 统计口径（医学统计学标准公式，禁止近似臆造）：
 *  · 样本标准差 s = sqrt( Σ(x-mean)² / (n-1) )；
 *  · Welch t：t = (m1-m2)/sqrt(s1²/n1 + s2²/n2)，
 *    df = (s1²/n1+s2²/n2)² / [ (s1²/n1)²/(n1-1) + (s2²/n2)²/(n2-1) ]，
 *    双侧 p = I_{df/(df+t²)}(df/2, 1/2)（正则化不完全贝塔函数）；
 *  · 卡方：χ² = ΣΣ (O-E)²/E，E_ij = 行和_i·列和_j/N，df=(r-1)(c-1)，
 *    p = 上侧不完全伽马 Q(df/2, χ²/2)；
 *  · KM：S(t) = Π_{t_i≤t}(1 - d_i/n_i)，Greenwood SE = S·sqrt(Σ d_i/(n_i(n_i-d_i)))。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ===========================================================================
// 数据模型
// ===========================================================================

export type Gender = 'M' | 'F';

/** 一例脱敏病例（科研视角，不含身份标识） */
export interface ResearchCase {
  caseId: string;
  patientId: string;
  gender: Gender;
  age: number;
  /** 诊断名列表，如 ['肺腺癌', '2型糖尿病'] */
  diagnoses: string[];
  /** 入院日期 YYYY-MM-DD */
  admissionDate: string;
  dischargeDate: string | null;
  /** 检查项目，如 ['胸部CT', 'PET-CT'] */
  exams: string[];
  labs: { name: string; value: number; unit: string }[];
  /** 治疗方案，如 ['标准化疗', '靶向治疗'] */
  treatments: string[];
  /** 预后标签，如 '好转' / '稳定' / '恶化' / '死亡' */
  prognosis: string;
  /** 随访天数（生存分析） */
  followUpDays: number | null;
  /** 终点事件：1=发生（如死亡），0=删失 */
  event: 0 | 1 | null;
}

export interface LabFilter {
  name: string;
  op: '>=' | '<=' | '>' | '<' | '==';
  value: number;
}

/** 智能检索条件：四组维度自由组合，组内 AND、组间 AND */
export interface ResearchSearchCriteria {
  /** 疾病关键词（诊断名子串匹配，忽略大小写） */
  disease?: string;
  /** 入院时间范围 */
  dateRange?: { start?: string | null; end?: string | null };
  /** 年龄区间（岁） */
  ageRange?: { min?: number | null; max?: number | null };
  gender?: Gender | 'ALL' | null;
  /** 检查项目关键词（命中任一即满足） */
  exams?: string[];
  /** 检验指标过滤（全部满足） */
  labFilters?: LabFilter[];
  /** 治疗方案关键词 */
  treatment?: string;
  /** 预后关键词 */
  prognosis?: string;
}

// ===========================================================================
// 描述性统计
// ===========================================================================

export interface DescriptiveStats {
  n: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function descriptive(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, sd: null, min: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median =
    n % 2 === 1
      ? sorted[(n - 1) / 2]!
      : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  const variance =
    n > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) // 样本方差（分母 n-1）
      : null;
  return {
    n,
    mean: round4(mean),
    median: round4(median),
    sd: variance === null ? null : round4(Math.sqrt(variance)),
    min: sorted[0]!,
    max: sorted[n - 1]!,
  };
}

// ===========================================================================
// 分布函数数值实现（Lanczos / 连分数，标准统计库同口径）
// ===========================================================================

/** Lanczos 近似 ln Γ(z)（g=7，系数组经 math.lgamma 校准，z>0） */
function logGamma(z: number): number {
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let l = coef[0]!;
  for (let i = 1; i <= 8; i++) {
    l += coef[i]! / (z + i - 1);
  }
  const t = z + 6.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(l)
  );
}

/** 不完全贝塔连分数展开（Numerical Recipes betacf） */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

/** 正则化不完全贝塔 I_x(a,b)：标准 t 检验 p 值即由此推出 */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** 下侧正则化不完全伽马 P(a,x) */
function lowerGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = logGamma(a);
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= 200; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

/** 上侧正则化不完全伽马 Q(a,x) = 1 - P(a,x)（χ² 检验 p 值口径）。
 *  x < a+1 时用级数展开 P；否则用连分数展开 Q。 */
export function upperGamma(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - lowerGamma(a, x);
  const gln = logGamma(a);
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const ai = -i * (i - a); // 连分数分子：-i(i-a)
    b += 2;
    d = b + ai * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + ai / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

// ===========================================================================
// Welch 两独立样本 t 检验
// ===========================================================================

export interface TTestResult {
  group1: string;
  group2: string;
  n1: number;
  n2: number;
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
  t: number;
  df: number;
  p: number;
  significant: boolean;
  interpretation: string;
}

export function welchTTest(
  name1: string, g1: number[],
  name2: string, g2: number[],
): TTestResult | null {
  if (g1.length < 2 || g2.length < 2) return null;
  const s1 = descriptive(g1);
  const s2 = descriptive(g2);
  if (s1.sd === null || s2.sd === null) return null;
  const v1 = (s1.sd ** 2) / g1.length;
  const v2 = (s2.sd ** 2) / g2.length;
  const mean1 = g1.reduce((s, v) => s + v, 0) / g1.length;
  const mean2 = g2.reduce((s, v) => s + v, 0) / g2.length;
  const t = (mean1 - mean2) / Math.sqrt(v1 + v2);
  const df =
    (v1 + v2) ** 2 /
    ((v1 ** 2) / (g1.length - 1) + (v2 ** 2) / (g2.length - 1));
  // 双侧 p：P(|T|>|t|) = I_{df/(df+t²)}(df/2, 1/2)
  const p = incompleteBeta(df / (df + t * t), df / 2, 1 / 2);
  const significant = p < 0.05;
  return {
    group1: name1,
    group2: name2,
    n1: g1.length,
    n2: g2.length,
    mean1: s1.mean ?? mean1,
    mean2: s2.mean ?? mean2,
    sd1: s1.sd,
    sd2: s2.sd,
    t: round4(t),
    df: round4(df),
    p: round4(p),
    significant,
    interpretation: significant
      ? `${name1} 与 ${name2} 差异有统计学意义（t=${round4(t)}, df=${round4(df)}, p=${round4(p)} < 0.05）`
      : `${name1} 与 ${name2} 差异无统计学意义（t=${round4(t)}, df=${round4(df)}, p=${round4(p)} ≥ 0.05）`,
  };
}

// ===========================================================================
// 卡方检验（r×c 列联表）
// ===========================================================================

export interface ChiSquareResult {
  table: number[][];
  expected: number[][];
  chi2: number;
  df: number;
  p: number;
  significant: boolean;
  interpretation: string;
}

export function chiSquareTest(table: number[][], label: string): ChiSquareResult | null {
  const rows = table.length;
  const cols = table[0]?.length ?? 0;
  if (rows < 2 || cols < 2) return null;
  const rowSums = table.map((r) => r.reduce((s, v) => s + v, 0));
  const colSums = Array.from({ length: cols }, (_, j) =>
    table.reduce((s, r) => s + r[j]!, 0),
  );
  const N = rowSums.reduce((s, v) => s + v, 0);
  if (N === 0) return null;
  const expected = table.map((r, i) =>
    r.map((_, j) => (rowSums[i]! * colSums[j]!) / N),
  );
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const e = expected[i]![j]!;
      if (e > 0) chi2 += (table[i]![j]! - e) ** 2 / e;
    }
  }
  const df = (rows - 1) * (cols - 1);
  const p = upperGamma(df / 2, chi2 / 2);
  const significant = p < 0.05;
  return {
    table,
    expected: expected.map((r) => r.map((v) => round4(v))),
    chi2: round4(chi2),
    df,
    p: round4(p),
    significant,
    interpretation: significant
      ? `${label}组间结局差异有统计学意义（χ²=${round4(chi2)}, df=${df}, p=${round4(p)} < 0.05）`
      : `${label}组间结局差异无统计学意义（χ²=${round4(chi2)}, df=${df}, p=${round4(p)} ≥ 0.05）`,
  };
}

// ===========================================================================
// Kaplan-Meier 生存分析
// ===========================================================================

export interface SurvivalPoint {
  time: number;
  survival: number;
  nAtRisk: number;
  events: number;
  censored: number;
  se: number;
}

export interface KMResult {
  points: SurvivalPoint[];
  medianSurvival: number | null;
}

export function kaplanMeier(
    samples: { time: number; event: 0 | 1 }[],
): KMResult {
  const sorted = [...samples].sort((a, b) => a.time - b.time);
  const times = Array.from(new Set(sorted.map((s) => s.time)));
  let survival = 1;
  let greenwoodSum = 0;
  const points: SurvivalPoint[] = [];
  let median: number | null = null;
  for (const t of times) {
    const nAtRisk = sorted.filter((s) => s.time >= t).length;
    const events = sorted.filter((s) => s.time === t && s.event === 1).length;
    const censored = sorted.filter((s) => s.time === t && s.event === 0).length;
    if (events > 0) {
      survival *= (nAtRisk - events) / nAtRisk;
      if (nAtRisk - events > 0) {
        greenwoodSum += events / (nAtRisk * (nAtRisk - events));
      }
    }
    const se = Math.sqrt(survival * survival * greenwoodSum);
    points.push({
      time: t,
      survival: round4(survival),
      nAtRisk,
      events,
      censored,
      se: round4(se),
    });
    if (median === null && survival <= 0.5) median = t;
  }
  return { points, medianSurvival: median };
}

// ===========================================================================
// 病例智能检索（纯函数）
// ===========================================================================

function includesAny(text: string[], keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  return text.some((t) => t.toLowerCase().includes(kw));
}

function matchLabFilter(c: ResearchCase, f: LabFilter): boolean {
  const lab = c.labs.find((l) =>
    l.name.toLowerCase().includes(f.name.trim().toLowerCase()),
  );
  if (!lab) return false;
  switch (f.op) {
    case '>=': return lab.value >= f.value;
    case '<=': return lab.value <= f.value;
    case '>': return lab.value > f.value;
    case '<': return lab.value < f.value;
    case '==': return lab.value === f.value;
  }
}

/**
 * 病例智能检索：四维度 AND 收敛。
 * @param criteria 检索条件
 * @param pool     候选病例池（路由层注入，保持纯函数无 IO）
 */
export function smartCaseSearch(
  criteria: ResearchSearchCriteria,
  pool: ResearchCase[],
): ResearchCase[] {
  return pool.filter((c) => {
    if (criteria.disease && !includesAny(c.diagnoses, criteria.disease)) return false;
    if (criteria.gender && criteria.gender !== 'ALL' && c.gender !== criteria.gender) return false;
    if (criteria.ageRange) {
      const { min, max } = criteria.ageRange;
      if (typeof min === 'number' && c.age < min) return false;
      if (typeof max === 'number' && c.age > max) return false;
    }
    if (criteria.dateRange) {
      const { start, end } = criteria.dateRange;
      if (start && c.admissionDate < start) return false;
      if (end && c.admissionDate > end) return false;
    }
    if (criteria.exams && criteria.exams.length > 0) {
      const ok = criteria.exams.every((kw) => includesAny(c.exams, kw));
      if (!ok) return false;
    }
    if (criteria.treatment && !includesAny(c.treatments, criteria.treatment)) return false;
    if (criteria.prognosis && !c.prognosis.includes(criteria.prognosis.trim())) return false;
    if (criteria.labFilters && criteria.labFilters.length > 0) {
      if (!criteria.labFilters.every((f) => matchLabFilter(c, f))) return false;
    }
    return true;
  });
}

// ===========================================================================
// 自动统计分析（纯函数）
// ===========================================================================

export interface AnalysisGroupInput {
  name: string;
  /** 连续变量（组间均值比较 → Welch t 检验） */
  values?: number[];
  /** 二分类结局事件数 / 未发生数（→ 卡方检验） */
  events?: number;
  nonEvents?: number;
  /** 生存数据：随访天数 + 是否终点事件 */
  survival?: { time: number; event: 0 | 1 }[];
}

export interface StatTable {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface StatisticalResult {
  descriptive: { group: string; stats: DescriptiveStats }[];
  rates: { group: string; events: number; total: number; rate: number | null }[];
  tTest: TTestResult | null;
  chiSquare: ChiSquareResult | null;
  survival: { group: string; km: KMResult }[];
  tables: StatTable[];
  summary: string;
}

export function autoStatisticalAnalysis(input: {
  groups: AnalysisGroupInput[];
  outcomeLabel?: string;
}): StatisticalResult {
  const groups = input.groups;
  const outcome = input.outcomeLabel ?? '结局事件';

  // 1) 描述性统计
  const descriptiveRows = groups
    .filter((g) => Array.isArray(g.values) && g.values.length > 0)
    .map((g) => ({ group: g.name, stats: descriptive(g.values ?? []) }));

  // 2) 率
  const rates = groups
    .filter((g) => typeof g.events === 'number' && typeof g.nonEvents === 'number')
    .map((g) => {
      const events = g.events ?? 0;
      const total = events + (g.nonEvents ?? 0);
      return {
        group: g.name,
        events,
        total,
        rate: total > 0 ? round4(events / total) : null,
      };
    });

  // 3) Welch t 检验（恰好两组连续变量时自动执行）
  let tTest: TTestResult | null = null;
  const valueGroups = groups.filter(
    (g) => Array.isArray(g.values) && g.values.length > 0,
  );
  if (valueGroups.length === 2) {
    tTest = welchTTest(
      valueGroups[0]!.name, valueGroups[0]!.values ?? [],
      valueGroups[1]!.name, valueGroups[1]!.values ?? [],
    );
  }

  // 4) 卡方检验（恰好两组二分类结局时自动执行 2×2）
  let chiSquare: ChiSquareResult | null = null;
  const rateGroups = groups.filter(
    (g) => typeof g.events === 'number' && typeof g.nonEvents === 'number',
  );
  if (rateGroups.length === 2) {
    const g1 = rateGroups[0]!;
    const g2 = rateGroups[1]!;
    chiSquare = chiSquareTest(
      [
        [g1.events ?? 0, g1.nonEvents ?? 0],
        [g2.events ?? 0, g2.nonEvents ?? 0],
      ],
      `${g1.name} vs ${g2.name}`,
    );
  }

  // 5) KM 生存分析
  const survival = groups
    .filter((g) => Array.isArray(g.survival) && g.survival.length > 0)
    .map((g) => ({ group: g.name, km: kaplanMeier(g.survival ?? []) }));

  // 6) 自动统计表格
  const tables: StatTable[] = [];
  if (descriptiveRows.length > 0) {
    tables.push({
      title: '表1 连续变量描述性统计',
      headers: ['组别', 'n', '均值', '中位数', '标准差', '最小值', '最大值'],
      rows: descriptiveRows.map((d) => [
        d.group, d.stats.n, d.stats.mean, d.stats.median,
        d.stats.sd, d.stats.min, d.stats.max,
      ]),
    });
  }
  if (rates.length > 0) {
    tables.push({
      title: `表2 ${outcome}发生率`,
      headers: ['组别', '事件数', '总数', '发生率'],
      rows: rates.map((r) => [
        r.group, r.events, r.total, r.rate === null ? null : `${(r.rate * 100).toFixed(2)}%`,
      ]),
    });
  }
  if (tTest) {
    tables.push({
      title: '表3 Welch t 检验',
      headers: ['比较', '均值差', 't', 'df', 'p', '结论'],
      rows: [[
        `${tTest.group1} vs ${tTest.group2}`,
        round4(tTest.mean1 - tTest.mean2),
        tTest.t, tTest.df, tTest.p,
        tTest.significant ? '有统计学意义' : '无统计学意义',
      ]],
    });
  }
  if (chiSquare) {
    tables.push({
      title: '表4 卡方检验',
      headers: ['比较', 'χ²', 'df', 'p', '结论'],
      rows: [[
        `${chiSquare.table.length}×${chiSquare.table[0]?.length ?? 0}列联表`,
        chiSquare.chi2, chiSquare.df, chiSquare.p,
        chiSquare.significant ? '有统计学意义' : '无统计学意义',
      ]],
    });
  }
  for (const s of survival) {
    tables.push({
      title: `表5 ${s.group} Kaplan-Meier 生存节点`,
      headers: ['时间(天)', '生存率 S(t)', '风险人数 n', '事件数', '删失数', 'Greenwood SE'],
      rows: s.km.points.map((p) => [
        p.time, p.survival, p.nAtRisk, p.events, p.censored, p.se,
      ]),
    });
  }

  const summaryParts: string[] = [];
  if (tTest) summaryParts.push(tTest.interpretation);
  if (chiSquare) summaryParts.push(chiSquare.interpretation);
  for (const s of survival) {
    summaryParts.push(
      `${s.group}中位生存期：${
        s.km.medianSurvival === null ? '观察期内未达到' : `${s.km.medianSurvival} 天`
      }`,
    );
  }
  if (summaryParts.length === 0) {
    summaryParts.push('已完成描述性统计；未满足组间比较的最低数据量（每组连续变量/事件数 ≥ 2）。');
  }

  return { descriptive: descriptiveRows, rates, tTest, chiSquare, survival, tables, summary: summaryParts.join('；') };
}

// ===========================================================================
// 科研报告自动生成（纯函数）
// ===========================================================================

export interface ResearchReport {
  projectId: string;
  title: string;
  generatedAt: string; // 调用方注入，保持无时钟
  sections: { heading: string; body: string }[];
  tables: StatTable[];
  conclusion: string;
}

export function generateResearchReport(
  projectId: string,
  input: {
    generatedAt: string;
    projectName?: string;
    disease?: string;
    criteria?: ResearchSearchCriteria;
    matchedCount?: number;
    stats?: StatisticalResult;
  },
): ResearchReport {
  const disease = input.disease ?? '未指定疾病';
  const title = `【集团与科研】${disease} 科研数据分析报告（项目 ${projectId}）`;

  const crit = input.criteria;
  const critLines: string[] = [];
  if (crit?.disease) critLines.push(`疾病：${crit.disease}`);
  if (crit?.gender && crit.gender !== 'ALL') critLines.push(`性别：${crit.gender === 'M' ? '男' : '女'}`);
  if (crit?.ageRange) critLines.push(`年龄：${crit.ageRange.min ?? '不限'}-${crit.ageRange.max ?? '不限'} 岁`);
  if (crit?.dateRange) critLines.push(`入院时间：${crit.dateRange.start ?? '不限'} ~ ${crit.dateRange.end ?? '不限'}`);
  if (crit?.treatment) critLines.push(`治疗方案：${crit.treatment}`);
  if (crit?.prognosis) critLines.push(`预后：${crit.prognosis}`);

  const stats = input.stats;
  const sections = [
    {
      heading: '一、研究背景与目的',
      body: `本项目（${input.projectName ?? projectId}）围绕「${disease}」开展回顾性队列分析，\n` +
        `目标是评估不同治疗方案下的临床结局差异，为集团科研处提供可复用的证据底稿。`,
    },
    {
      heading: '二、病例纳入与检索条件',
      body: `本次智能检索命中病例 ${input.matchedCount ?? 0} 例。检索条件：\n- ${critLines.join('\n- ') || '无条件（全队列）'}。`,
    },
    {
      heading: '三、统计方法',
      body: `连续变量以均值±标准差描述，组间比较采用 Welch 两独立样本 t 检验；\n` +
        `二分类结局采用 Pearson χ² 检验；生存资料采用 Kaplan-Meier 法估计生存率，\n` +
        `Greenwood 法估计标准误；检验水准 α=0.05（双侧）。`,
    },
    {
      heading: '四、统计结果',
      body: stats?.summary ?? '暂无统计结果。',
    },
  ];

  const conclusionParts: string[] = [];
  if (stats?.tTest) conclusionParts.push(stats.tTest.interpretation);
  if (stats?.chiSquare) conclusionParts.push(stats.chiSquare.interpretation);
  for (const s of stats?.survival ?? []) {
    conclusionParts.push(
      `${s.group}中位生存期 ${s.km.medianSurvival ?? '未达到'} 天`,
    );
  }
  const conclusion = conclusionParts.length > 0
    ? conclusionParts.join('；') + '。以上结论基于本队列脱敏数据，不构成个体诊疗建议。'
    : '本队列尚不足以完成组间比较，建议扩大样本量后复算。';

  return {
    projectId,
    title,
    generatedAt: input.generatedAt,
    sections,
    tables: stats?.tables ?? [],
    conclusion,
  };
}

// ===========================================================================
// 演示病例池（生产环境由 DB 仓储层替换；路由层仅用于端到端联调演示）
// ===========================================================================

export const SAMPLE_CASE_POOL: ResearchCase[] = [
  { caseId: 'C001', patientId: 'P001', gender: 'M', age: 58, diagnoses: ['肺腺癌'], admissionDate: '2025-01-05', dischargeDate: '2025-01-20', exams: ['胸部CT', 'PET-CT'], labs: [{ name: 'CEA', value: 25, unit: 'ng/ml' }], treatments: ['标准化疗'], prognosis: '稳定', followUpDays: 180, event: 1 },
  { caseId: 'C002', patientId: 'P002', gender: 'F', age: 62, diagnoses: ['肺腺癌'], admissionDate: '2025-01-08', dischargeDate: '2025-01-25', exams: ['胸部CT'], labs: [{ name: 'CEA', value: 18, unit: 'ng/ml' }], treatments: ['靶向治疗'], prognosis: '好转', followUpDays: 360, event: 0 },
  { caseId: 'C003', patientId: 'P003', gender: 'M', age: 71, diagnoses: ['肺腺癌', '2型糖尿病'], admissionDate: '2025-02-02', dischargeDate: '2025-02-19', exams: ['PET-CT'], labs: [{ name: 'CEA', value: 40, unit: 'ng/ml' }], treatments: ['标准化疗'], prognosis: '恶化', followUpDays: 90, event: 1 },
  { caseId: 'C004', patientId: 'P004', gender: 'F', age: 49, diagnoses: ['肺腺癌'], admissionDate: '2025-02-14', dischargeDate: '2025-03-01', exams: ['胸部CT'], labs: [{ name: 'CEA', value: 12, unit: 'ng/ml' }], treatments: ['靶向治疗'], prognosis: '好转', followUpDays: 360, event: 0 },
  { caseId: 'C005', patientId: 'P005', gender: 'M', age: 66, diagnoses: ['乳腺癌'], admissionDate: '2025-03-01', dischargeDate: '2025-03-15', exams: ['乳腺超声'], labs: [{ name: 'CA153', value: 35, unit: 'U/ml' }], treatments: ['内分泌治疗'], prognosis: '好转', followUpDays: 300, event: 0 },
  { caseId: 'C006', patientId: 'P006', gender: 'F', age: 55, diagnoses: ['乳腺癌'], admissionDate: '2025-03-11', dischargeDate: '2025-03-28', exams: ['乳腺超声', 'PET-CT'], labs: [{ name: 'CA153', value: 50, unit: 'U/ml' }], treatments: ['化疗'], prognosis: '稳定', followUpDays: 200, event: 1 },
  { caseId: 'C007', patientId: 'P007', gender: 'M', age: 63, diagnoses: ['肺腺癌'], admissionDate: '2025-04-05', dischargeDate: '2025-04-22', exams: ['胸部CT'], labs: [{ name: 'CEA', value: 30, unit: 'ng/ml' }], treatments: ['标准化疗'], prognosis: '死亡', followUpDays: 60, event: 1 },
  { caseId: 'C008', patientId: 'P008', gender: 'F', age: 59, diagnoses: ['肺腺癌'], admissionDate: '2025-04-18', dischargeDate: '2025-05-05', exams: ['PET-CT'], labs: [{ name: 'CEA', value: 15, unit: 'ng/ml' }], treatments: ['靶向治疗'], prognosis: '好转', followUpDays: 240, event: 0 },
  { caseId: 'C009', patientId: 'P009', gender: 'M', age: 75, diagnoses: ['结直肠癌'], admissionDate: '2025-05-09', dischargeDate: '2025-05-26', exams: ['肠镜'], labs: [{ name: 'CEA', value: 60, unit: 'ng/ml' }], treatments: ['化疗'], prognosis: '恶化', followUpDays: 120, event: 1 },
  { caseId: 'C010', patientId: 'P010', gender: 'F', age: 68, diagnoses: ['结直肠癌'], admissionDate: '2025-05-20', dischargeDate: '2025-06-08', exams: ['肠镜', 'PET-CT'], labs: [{ name: 'CEA', value: 22, unit: 'ng/ml' }], treatments: ['化疗'], prognosis: '稳定', followUpDays: 210, event: 0 },
  { caseId: 'C011', patientId: 'P011', gender: 'M', age: 52, diagnoses: ['肺腺癌'], admissionDate: '2025-06-10', dischargeDate: '2025-06-27', exams: ['胸部CT'], labs: [{ name: 'CEA', value: 10, unit: 'ng/ml' }], treatments: ['靶向治疗'], prognosis: '好转', followUpDays: 180, event: 0 },
  { caseId: 'C012', patientId: 'P012', gender: 'F', age: 60, diagnoses: ['肺腺癌'], admissionDate: '2025-06-25', dischargeDate: '2025-07-12', exams: ['胸部CT', 'PET-CT'], labs: [{ name: 'CEA', value: 28, unit: 'ng/ml' }], treatments: ['标准化疗'], prognosis: '死亡', followUpDays: 100, event: 1 },
];
