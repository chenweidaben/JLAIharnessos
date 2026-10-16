/**
 * 健澜科技 jlmedaios - AI 医院大脑深化聚合器（M159-A，中期路线图）
 *
 * 【中期路线图】实时大屏（M156-B）只回答「现在是多少」，本模块回答
 *   「为什么异常、该怎么办、接下来会怎样」——真智能，不是只显示数字：
 *     1. 智能预警 generateBrainAlert(metric, deviation, history)：
 *        把当前指标与历史基线对比，偏离越界即自动发现异常，
 *        并给出按指标 + 方向收敛的根因候选（likelyCauses）；
 *     2. 决策建议 generateBrainRecommendation(metric, context)：
 *        针对异常给出可执行动作（如「床位紧张，建议开放加床」）与预期收益；
 *     3. 趋势预测 deepHospitalBrain 内部线性外推：
 *        基于历史序列做最小二乘回归，预测未来 7 天门诊量 / 床位使用率 / 手术台数；
 *     4. 根因分析 deepHospitalBrain 汇总：
 *        对显著偏离指标给出诊断结论 + 证据链 + 置信度
 *        （如「门诊量下降原因：周边新医院开业形成患者分流」）。
 *
 * 纯函数红线：不读库、不发请求、不触碰 WebSocket、不写 SQL、不新增依赖；
 *   全部逻辑可单测、可复现（固定输入必得固定输出）。
 *
 * 医疗安全红线：仅科室 / 院区级聚合，不含患者 PII；
 *   预警与建议为辅助决策，最终由值班院领导 / 科主任本人确认执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 输入类型
// ---------------------------------------------------------------------------

/** 深化分析所需的当前指标快照（对比历史基线用） */
export interface DeepMetrics {
  /** 今日门诊量（人次） */
  outpatientToday: number;
  /** 当前在院人数 */
  inHospital: number;
  /** 核定床位总数 */
  totalBeds: number;
  /** 当前床位使用率（%） */
  bedRate: number;
  /** 今日手术台数 */
  surgeryToday: number;
  /** 危急值待闭环条数 */
  criticalValuePending: number;
}

/** 历史序列单日记录（最近 N 天，按日期升序） */
export interface HistoryPoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 当日门诊量（人次） */
  outpatient: number;
  /** 当日平均床位使用率（%） */
  bedRate: number;
  /** 当日手术台数 */
  surgery: number;
}

// ---------------------------------------------------------------------------
// 输出类型
// ---------------------------------------------------------------------------

/** 被监控的指标键 */
export type MetricKey = 'outpatient' | 'bedRate' | 'surgery';

/** 预警严重度 */
export type AlertSeverity = 'high' | 'medium' | 'low';

/** 决策建议优先级 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/** 智能预警单条结果（异常指标自动发现 + 原因分析） */
export interface BrainAlert {
  /** 预警唯一标识（metric + 序号） */
  id: string;
  metric: MetricKey;
  severity: AlertSeverity;
  /** 短标题，如「门诊量较基线下降 22%」 */
  title: string;
  /** 当前观测值（由基线 × 偏离比例还原，保留一位小数） */
  observed: number;
  /** 历史基线期望值（最近观察窗均值） */
  expected: number;
  /** 偏离百分比：正=高于基线，负=低于基线（床位使用率按绝对百分点计） */
  deviationPct: number;
  /** 人话说明：哪条数据、偏离多少 */
  summary: string;
  /** 根因候选（按可能性排序） */
  likelyCauses: string[];
}

/** 决策建议单条结果（如「床位紧张，建议开放加床」） */
export interface BrainRecommendation {
  id: string;
  metric: MetricKey;
  priority: RecommendationPriority;
  title: string;
  /** 背景依据：基于哪项异常得出 */
  message: string;
  /** 可执行动作（辅助决策，最终由值班人员确认执行） */
  suggestedAction: string;
  /** 预期收益 */
  expectedBenefit: string;
}

/** 未来 7 天预测单日点 */
export interface ForecastPoint {
  date: string;
  /** 预测门诊量（人次，取整） */
  outpatient: number;
  /** 预测床位使用率（%，保留一位小数，钳制在 40~100） */
  bedRate: number;
  /** 预测手术台数（取整） */
  surgery: number;
}

/** 根因分析单条结果 */
export interface RootCauseItem {
  metric: MetricKey;
  deviationPct: number;
  /** 根因诊断结论（如「门诊量下降原因：周边新医院开业形成患者分流」） */
  diagnosis: string;
  /** 证据链（历史数值与对比事实） */
  evidence: string[];
  /** 置信度 0~1 */
  confidence: number;
}

/** deepHospitalBrain 汇总输出 */
export interface DeepBrain {
  /** 生成时刻 ISO */
  generatedAt: string;
  /** 固定标记：演示模式数据 */
  demo: true;
  hospital: { code: string; name: string };
  /** 智能预警列表（严重度 high → medium → low 排序） */
  alerts: BrainAlert[];
  /** 决策建议列表（优先级 high → medium → low 排序） */
  recommendations: BrainRecommendation[];
  /** 趋势预测 */
  forecast: { horizonDays: number; series: ForecastPoint[] };
  /** 根因分析列表（仅显著偏离指标） */
  rootCauses: RootCauseItem[];
}

/** generateBrainRecommendation 的上下文 */
export interface RecommendationContext {
  /** 该指标偏离基线百分比 */
  deviationPct: number;
  /** 当前床位使用率（%），仅床位相关建议需要 */
  bedRate?: number;
  /** 危急值待闭环条数 */
  criticalValuePending?: number;
}

// ---------------------------------------------------------------------------
// 阈值常量（导出便于单测与审计追溯）
// ---------------------------------------------------------------------------

/** 偏离绝对值 ≥ 20% → 高严重度预警 */
export const DEVIATION_HIGH = 20;
/** 偏离绝对值 ≥ 10% → 中严重度预警 */
export const DEVIATION_MID = 10;
/** 偏离绝对值 ≥ 5% → 低严重度预警（低于此不打扰） */
export const DEVIATION_LOW = 5;
/** 床位使用率 ≥ 95% → 直接判高（不论偏离幅度） */
export const BED_RATE_CRITICAL = 95;
/** 床位使用率 ≥ 90% → 触发加床 / 分流决策建议 */
export const BED_RATE_TIGHT = 90;
/** 危急值待闭环 ≥ 5 条 → 高优先级处置建议 */
export const CRITICAL_PENDING_HIGH = 5;
/** 趋势预测 horizon（天） */
export const FORECAST_HORIZON = 7;
/** 基线观察窗：取最近 N 天历史均值 */
export const BASELINE_WINDOW = 7;

// ---------------------------------------------------------------------------
// 内部工具（纯函数）
// ---------------------------------------------------------------------------

/** 安全均值（空数组返回 0） */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** 保留一位小数 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 钳制到 [lo, hi] */
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 解析 YYYY-MM-DD 为本地 Date（避开 UTC 时区漂移） */
function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map((s) => Number(s));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 格式化 Date 为 YYYY-MM-DD */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 日期加 N 天 */
function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** 最近观察窗：最多取最后 window 个点 */
function recentWindow(history: HistoryPoint[], windowSize: number): HistoryPoint[] {
  return history.slice(Math.max(0, history.length - windowSize));
}

/** 最小二乘线性回归：给定序列值，返回斜率与截距（x 为 0..n-1） */
function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let x = 0; x < n; x += 1) {
    sx += x;
    sy += values[x] ?? 0;
    sxy += x * (values[x] ?? 0);
    sxx += x * x;
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// ---------------------------------------------------------------------------
// 根因候选库（中期路线图：规则化根因，后续接入知识图谱 / LLM 增强）
// ---------------------------------------------------------------------------

/**
 * 按指标 + 偏离方向给出根因候选（按可能性排序）。
 * outpatient 下降、床位率升高、手术下降等典型场景覆盖。
 */
function likelyCausesFor(metric: MetricKey, deviationPct: number): string[] {
  const down = deviationPct < 0;
  switch (metric) {
    case 'outpatient':
      return down
        ? [
            '周边新开业大型医院形成患者分流（专科 / 大型设备虹吸）',
            '近期节假日或极端天气导致到院就诊量回落',
            '号源投放或线上预约渠道异常导致患者约不上号',
          ]
        : [
            '呼吸道 / 传染病季节性就诊高峰',
            '大型义诊、体检异常报告集中到院复诊',
            '医联体上转患者量短期集中增加',
          ];
    case 'bedRate':
      return down
        ? ['择期手术排程不足致出院放缓、入院受限', '日间手术分流比例提高减少住院占用']
        : ['周末 / 节假日出院低谷造成床位滞留', '收治病种平均住院日延长', '转科等待与术后观察占床增加'];
    case 'surgery':
      return down
        ? [
            '关键手术间设备故障待修导致排程取消',
            '择期手术排程周内分布不均',
            '麻醉医生排班缺口制约开台',
          ]
        : [
            '限期手术集中清零（如体检发现需限期处理病种）',
            '科室亚专业开台率提升',
            '急诊手术占比短期上升',
          ];
  }
}

// ---------------------------------------------------------------------------
// 对外纯函数 1：智能预警 generateBrainAlert
// ---------------------------------------------------------------------------

/**
 * 【中期路线图】generateBrainAlert —— 异常指标自动发现 + 原因分析。
 * 纯函数：仅由指标键、偏离百分比与历史基线决定输出，无任何 I/O。
 *
 * @param metric     指标键
 * @param deviation  偏离基线百分比（正=偏高，负=偏低；床位率按百分点）
 * @param history    历史序列（用于计算基线均值与异常观测值）
 * @returns          BrainAlert（含严重度、观测/基线、根因候选）
 */
export function generateBrainAlert(metric: MetricKey, deviation: number, history: HistoryPoint[]): BrainAlert {
  const win = recentWindow(history, BASELINE_WINDOW);
  const pick = (p: HistoryPoint): number =>
    metric === 'outpatient' ? p.outpatient : metric === 'bedRate' ? p.bedRate : p.surgery;
  const expected = round1(mean(win.map(pick)));
  // 观测值 = 基线 ×（1 + 偏离比例），与调用方传入的 deviation 自洽
  const observed = metric === 'bedRate' ? round1(expected + deviation) : round1(expected * (1 + deviation / 100));

  const absDev = Math.abs(deviation);
  const bedCritical = metric === 'bedRate' && observed >= BED_RATE_CRITICAL;
  const severity: AlertSeverity =
    bedCritical || absDev >= DEVIATION_HIGH ? 'high' : absDev >= DEVIATION_MID ? 'medium' : 'low';

  const label = metric === 'outpatient' ? '门诊量' : metric === 'bedRate' ? '床位使用率' : '手术量';
  const unit = metric === 'outpatient' ? '人次' : metric === 'bedRate' ? '%' : '台';
  const dirText = deviation >= 0 ? `偏高 ${round1(absDev)}${metric === 'bedRate' ? ' 个百分点' : '%'}` : `下降 ${round1(absDev)}${metric === 'bedRate' ? ' 个百分点' : '%'}`;

  return {
    id: `BA-${metric}-${severity}`,
    metric,
    severity,
    title: `${label}较基线${deviation >= 0 ? '上升' : '下降'} ${round1(absDev)}${metric === 'bedRate' ? 'pp' : '%'}`,
    observed,
    expected,
    deviationPct: round1(deviation),
    summary: `当前${label} ${observed}${unit}，近${win.length}天基线均值 ${expected}${unit}，${dirText}。`,
    likelyCauses: likelyCausesFor(metric, deviation),
  };
}

// ---------------------------------------------------------------------------
// 对外纯函数 2：决策建议 generateBrainRecommendation
// ---------------------------------------------------------------------------

/**
 * 【中期路线图】generateBrainRecommendation —— 针对异常给出可执行决策建议。
 * 纯函数：阈值与上下文决定建议内容，无 I/O。
 *
 * @param metric  指标键
 * @param context 偏离幅度 / 床位率 / 危急值积压等上下文
 * @returns       BrainRecommendation（可执行动作 + 预期收益）
 */
export function generateBrainRecommendation(metric: MetricKey, context: RecommendationContext): BrainRecommendation {
  const { deviationPct: dev } = context;

  // 床位紧张 → 加床 / 分流（任务示例：「床位紧张建议开放加床」）
  if (metric === 'bedRate' && (context.bedRate ?? 0) >= BED_RATE_TIGHT) {
    const tight = (context.bedRate ?? 0) >= BED_RATE_CRITICAL;
    return {
      id: `BR-${metric}-tight`,
      metric,
      priority: tight ? 'high' : 'medium',
      title: tight ? `床位使用率 ${context.bedRate}% 已达饱和` : `床位使用率 ${context.bedRate}% 高位运行`,
      message: `当前在院占床率 ${context.bedRate}%，${tight ? '已突破 95% 临界线' : '超过 90% 高水位线'}，继续收治将影响急危重症接治。`,
      suggestedAction: '床位紧张，建议开放加床：护理部统筹陪护床与加床物资，同步启动日间手术与择期出院分流',
      expectedBenefit: '预计 48 小时内释放床位 30~50 张，急危重症接治能力恢复',
    };
  }

  // 门诊量下滑 → 竞争分流应对 + 号源 / 互联网医院引流
  if (metric === 'outpatient' && dev <= -DEVIATION_MID) {
    return {
      id: `BR-${metric}-drop`,
      metric,
      priority: dev <= -DEVIATION_HIGH ? 'high' : 'medium',
      title: `门诊量较基线下降 ${Math.abs(round1(dev))}%`,
      message: `门诊量连续低于基线，疑似周边新医院开业分流或号源触达不足，需主动引流。`,
      suggestedAction: '分析周边竞争格局，增加专家号源投放与短视频 / 互联网医院复诊引流，开展社区义诊挽回患者',
      expectedBenefit: '预计两周内门诊量回升 8%~12%，稳住基本盘',
    };
  }

  // 门诊量冲高 → 增开机动诊室
  if (metric === 'outpatient' && dev >= DEVIATION_MID) {
    return {
      id: `BR-${metric}-surge`,
      metric,
      priority: dev >= DEVIATION_HIGH ? 'high' : 'medium',
      title: `门诊量较基线上升 ${round1(dev)}%`,
      message: `门诊量显著高于基线，候诊与就诊通道承压。`,
      suggestedAction: '高峰时段增开机动诊室与自助报到通道，检查叫号系统容量，增派导诊志愿者',
      expectedBenefit: '预计平均候诊时长下降 15~20 分钟，患者满意度回升',
    };
  }

  // 手术量下滑 → 排程 / 设备排查
  if (metric === 'surgery' && dev <= -DEVIATION_MID) {
    return {
      id: `BR-${metric}-drop`,
      metric,
      priority: dev <= -DEVIATION_HIGH ? 'high' : 'medium',
      title: `手术量较基线下降 ${Math.abs(round1(dev))}%`,
      message: `手术量走低，疑似设备故障取消排程或周内分布不均。`,
      suggestedAction: '设备科排查手术间设备待修清单，医务处统筹周末开台与日间手术扩容',
      expectedBenefit: '预计周手术量回升至基线 95% 以上，提升床位周转',
    };
  }

  // 危急值积压（独立指标外的运行规则）
  if (context.criticalValuePending !== undefined && context.criticalValuePending >= CRITICAL_PENDING_HIGH) {
    return {
      id: `BR-warning-critical`,
      metric,
      priority: 'high',
      title: `危急值待闭环 ${context.criticalValuePending} 条`,
      message: `危急值待处理 ${context.criticalValuePending} 条，超过 ${CRITICAL_PENDING_HIGH} 条高水位线，存在患者安全风险。`,
      suggestedAction: '值班科主任逐条电话通知临床并闭环复核，信息科排查推送通道延迟',
      expectedBenefit: '危急值闭环时长回到规范时限，消除安全隐患',
    };
  }

  // 兜底：低优先级观察建议
  return {
    id: `BR-${metric}-watch`,
    metric,
    priority: 'low',
    title: `${metric === 'outpatient' ? '门诊量' : metric === 'bedRate' ? '床位使用率' : '手术量'}小幅波动`,
    message: `偏离基线 ${round1(dev)}%，尚在观察区间，建议持续监测。`,
    suggestedAction: '纳入次日晨会运行通报，暂无需处置动作',
    expectedBenefit: '避免误报打扰，保持运行平稳',
  };
}

// ---------------------------------------------------------------------------
// 对外纯函数 3：趋势预测（7 天门诊量 / 床位 / 手术）
// ---------------------------------------------------------------------------

/**
 * 基于历史序列最小二乘外推未来 N 天（纯函数）。
 */
function forecastSeries(history: HistoryPoint[]): ForecastPoint[] {
  if (history.length === 0) return [];
  const outValues = history.map((p) => p.outpatient);
  const bedValues = history.map((p) => p.bedRate);
  const surgeryValues = history.map((p) => p.surgery);
  const outFit = linearFit(outValues);
  const bedFit = linearFit(bedValues);
  const surgeryFit = linearFit(surgeryValues);

  const lastIdx = history.length - 1;
  const lastDate = history[history.length - 1]?.date ?? formatDate(new Date());
  const series: ForecastPoint[] = [];
  for (let step = 1; step <= FORECAST_HORIZON; step += 1) {
    const x = lastIdx + step;
    series.push({
      date: addDays(lastDate, step),
      outpatient: Math.max(0, Math.round(outFit.intercept + outFit.slope * x)),
      bedRate: round1(clamp(bedFit.intercept + bedFit.slope * x, 40, 100)),
      surgery: Math.max(0, Math.round(surgeryFit.intercept + surgeryFit.slope * x)),
    });
  }
  return series;
}

// ---------------------------------------------------------------------------
// 对外纯函数 4：根因分析汇总
// ---------------------------------------------------------------------------

/**
 * 对显著偏离指标生成根因诊断（结论 + 证据链 + 置信度）。
 */
function buildRootCauses(metrics: DeepMetrics, history: HistoryPoint[]): RootCauseItem[] {
  const win = recentWindow(history, BASELINE_WINDOW);
  const causes: RootCauseItem[] = [];

  const outMean = mean(win.map((p) => p.outpatient));
  const outDev = outMean === 0 ? 0 : ((metrics.outpatientToday - outMean) / outMean) * 100;
  if (Math.abs(outDev) >= DEVIATION_MID) {
    const down = outDev < 0;
    causes.push({
      metric: 'outpatient',
      deviationPct: round1(outDev),
      diagnosis: down
        ? `门诊量下降原因：周边新医院开业形成患者分流（叠加号源触达不足）`
        : `门诊量上升原因：季节性就诊高峰叠加医联体上转集中`,
      evidence: [
        `今日门诊 ${metrics.outpatientToday} 人次 vs 近${win.length}天基线 ${Math.round(outMean)} 人次`,
        `偏离 ${round1(outDev)}%，${Math.abs(outDev) >= DEVIATION_HIGH ? '已达高水位线' : '进入观察区'}`,
        down ? '建议：核对周边新开医疗机构开业时点与科室设置' : '建议：备足机动诊室与医护排班',
      ],
      confidence: clamp(0.5 + Math.abs(outDev) / 100, 0.5, 0.9),
    });
  }

  const bedMean = mean(win.map((p) => p.bedRate));
  const bedDev = metrics.bedRate - bedMean;
  if (Math.abs(bedDev) >= DEVIATION_MID) {
    causes.push({
      metric: 'bedRate',
      deviationPct: round1(bedDev),
      diagnosis: bedDev > 0 ? '床位使用率升高原因：出院低谷叠加住院日延长' : '床位使用率下降原因：日间手术分流提高',
      evidence: [
        `当前床位率 ${metrics.bedRate}% vs 近${win.length}天基线 ${round1(bedMean)}%`,
        `在院 ${metrics.inHospital} / 核定 ${metrics.totalBeds} 张`,
      ],
      confidence: clamp(0.55 + Math.abs(bedDev) / 100, 0.55, 0.9),
    });
  }

  const surgeryMean = mean(win.map((p) => p.surgery));
  const surgeryDev = surgeryMean === 0 ? 0 : ((metrics.surgeryToday - surgeryMean) / surgeryMean) * 100;
  if (Math.abs(surgeryDev) >= DEVIATION_MID) {
    causes.push({
      metric: 'surgery',
      deviationPct: round1(surgeryDev),
      diagnosis: surgeryDev < 0 ? '手术量下降原因：设备待修致排程取消 + 周内分布不均' : '手术量上升原因：限期手术集中清零',
      evidence: [
        `今日手术 ${metrics.surgeryToday} 台 vs 近${win.length}天基线 ${Math.round(surgeryMean)} 台`,
        `偏离 ${round1(surgeryDev)}%`,
      ],
      confidence: clamp(0.5 + Math.abs(surgeryDev) / 100, 0.5, 0.9),
    });
  }

  return causes;
}

// ---------------------------------------------------------------------------
// 对外纯函数 0：deepHospitalBrain 总装
// ---------------------------------------------------------------------------

/**
 * 【中期路线图】deepHospitalBrain —— AI 医院大脑深化总装。
 * 纯函数：给定当前指标与历史序列，一次性产出
 *   智能预警 + 决策建议 + 7 天趋势预测 + 根因分析。
 *
 * @param metrics 当前运行指标快照
 * @param history 最近 N 天历史序列（按日期升序）
 * @returns       DeepBrain 深化分析结果
 */
export function deepHospitalBrain(metrics: DeepMetrics, history: HistoryPoint[]): DeepBrain {
  const win = recentWindow(history, BASELINE_WINDOW);

  // ---- 1) 计算三项指标偏离 ----
  const outMean = mean(win.map((p) => p.outpatient));
  const bedMean = mean(win.map((p) => p.bedRate));
  const surgeryMean = mean(win.map((p) => p.surgery));
  const deviations: Record<MetricKey, number> = {
    outpatient: outMean === 0 ? 0 : ((metrics.outpatientToday - outMean) / outMean) * 100,
    bedRate: metrics.bedRate - bedMean,
    surgery: surgeryMean === 0 ? 0 : ((metrics.surgeryToday - surgeryMean) / surgeryMean) * 100,
  };

  // ---- 2) 智能预警：偏离越界即发现 ----
  const alerts: BrainAlert[] = (Object.keys(deviations) as MetricKey[])
    .filter((m) => Math.abs(deviations[m]) >= DEVIATION_LOW || (m === 'bedRate' && metrics.bedRate >= BED_RATE_CRITICAL))
    .map((m) => generateBrainAlert(m, deviations[m], history));
  const sevWeight: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => sevWeight[a.severity] - sevWeight[b.severity]);

  // ---- 3) 决策建议：有预警指标即给建议 + 危急值规则 ----
  const recommendations: BrainRecommendation[] = alerts.map((a) =>
    generateBrainRecommendation(a.metric, {
      deviationPct: a.deviationPct,
      bedRate: a.metric === 'bedRate' ? metrics.bedRate : undefined,
      criticalValuePending: a.metric === 'outpatient' ? metrics.criticalValuePending : undefined,
    }),
  );
  if (metrics.criticalValuePending >= CRITICAL_PENDING_HIGH) {
    recommendations.push(
      generateBrainRecommendation('outpatient', {
        deviationPct: 0,
        criticalValuePending: metrics.criticalValuePending,
      }),
    );
  }
  const prioWeight: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => prioWeight[a.priority] - prioWeight[b.priority]);

  // ---- 4) 趋势预测：未来 7 天 ----
  const forecast = { horizonDays: FORECAST_HORIZON, series: forecastSeries(history) };

  // ---- 5) 根因分析 ----
  const rootCauses = buildRootCauses(metrics, history);

  return {
    generatedAt: new Date().toISOString(),
    demo: true,
    hospital: { code: 'HQ', name: '杭州健澜示范医院' },
    alerts,
    recommendations,
    forecast,
    rootCauses,
  };
}

// ---------------------------------------------------------------------------
// 演示数据装配（路由用；纯函数、确定性 seed）
// ---------------------------------------------------------------------------

/** 确定性伪随机（mulberry32）：seed 相同序列一致 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 演示模式：构造 14 天历史 + 今日指标（门诊量明显下滑、床位率高位），
 * 让深化分析「真有东西可讲」。seed 可注入（测试固定）。
 */
export function buildDeepDemo(seed?: number): { metrics: DeepMetrics; history: HistoryPoint[] } {
  const s = seed ?? new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
  const rand = mulberry32(s);

  const history: HistoryPoint[] = [];
  const today = new Date();
  for (let i = 14; i >= 1; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    // 基线门诊约 2400，周末六成，叠加轻微下行趋势 + 噪声
    const trend = 2400 - (14 - i) * 6;
    history.push({
      date: formatDate(d),
      outpatient: Math.round(trend * (weekend ? 0.62 : 1) + rand() * 80 - 40),
      bedRate: round1(84 + rand() * 4),
      surgery: Math.round(22 + rand() * 5),
    });
  }

  // 今日：门诊量较基线下降约 22%（触发高严重度预警 + 根因分析），床位率 91.5%（加床建议）
  const metrics: DeepMetrics = {
    outpatientToday: 1850,
    inHospital: 1098,
    totalBeds: 1200,
    bedRate: 91.5,
    surgeryToday: 21,
    criticalValuePending: 2,
  };
  return { metrics, history };
}
