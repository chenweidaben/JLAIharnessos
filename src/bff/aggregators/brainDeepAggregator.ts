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

// ===========================================================================
// M170-C：AI 医院大脑深化——更多指标与预测（自学习与数字孪生）
// ---------------------------------------------------------------------------
// 在 M159-A「异常发现 + 根因 + 7 天预测」之上，把大脑洞察从运行指标扩展到
//   医疗质量 / 运营效率 / 患者体验 / 财务健康 四大维度，并跨指标做相关分析
//   与可执行洞察（不是「建议关注」，而是「谁、因为什么、做什么、预期收益」）。
// 纯函数红线不变：不读库、不写 SQL、不触碰 WebSocket、不新增依赖。
// ===========================================================================

/**
 * M170-C 扩展指标快照（四大维度，单位见字段注释）。
 * 仅院区级聚合，不含患者 PII；阈值参考国家三级公立医院绩效考核与 DRG 支付规范。
 */
export interface ExpandedMetrics {
  // ---- 医疗质量 ----
  /** 甲级病历率（%，目标 ≥ 90） */
  recordA1Rate: number;
  /** 手术并发症率（%，目标 ≤ 1.5） */
  surgeryComplicationRate: number;
  /** 院感率（%，目标 ≤ 2.0） */
  infectionRate: number;
  // ---- 运营效率 ----
  /** 床位周转率（次/周，目标 ≥ 1.2） */
  bedTurnover: number;
  /** 平均住院日（天，目标 ≤ 8.5） */
  avgLOS: number;
  /** 平均等待时间（分钟，目标 ≤ 30） */
  avgWaitMinutes: number;
  // ---- 患者体验 ----
  /** 总体满意度（%，目标 ≥ 92） */
  satisfaction: number;
  /** 净推荐值 NPS（-100 ~ 100，目标 ≥ 30） */
  nps: number;
  /** 投诉率（‰，目标 ≤ 1.0） */
  complaintRate: number;
  /** 表扬率（‰，目标 ≥ 2.0） */
  praiseRate: number;
  // ---- 财务健康 ----
  /** 医疗收入（万元/月） */
  revenueWan: number;
  /** 医疗成本（万元/月） */
  costWan: number;
  /** 医疗结余（万元/月，= 收入 - 成本） */
  profitWan: number;
  /** DRG 结余（万元/月，正值=超支已控） */
  drgSurplusWan: number;
}

/** 维度键 */
export type DimensionKey = 'quality' | 'efficiency' | 'experience' | 'finance';

/** 单维度评分结果 */
export interface DimensionScore {
  key: DimensionKey;
  /** 中文名 */
  label: string;
  /** 0~100 综合得分 */
  score: number;
  /** 健康状态 */
  status: 'excellent' | 'good' | 'warn' | 'risk';
  /** 距目标差距说明（人话） */
  gap: string;
  /** 该维度下拖后腿的子指标 */
  drags: { name: string; value: number; target: string }[];
}

/** expandHospitalBrain 输出 */
export interface ExpandedBrain {
  generatedAt: string;
  demo: true;
  hospital: { code: string; name: string };
  /** 大脑综合指数（0~100，四维加权） */
  brainIndex: number;
  /** 大脑健康等级 */
  level: 'A' | 'B' | 'C' | 'D';
  dimensions: DimensionScore[];
  /** 利润率（% = profit / revenue * 100） */
  profitMargin: number;
}

// ---------------------------------------------------------------------------
// M170-C 纯函数 1：expandHospitalBrain——四大维度指标扩展 + 评分
// ---------------------------------------------------------------------------

/** 把单项「越高越好」的指标映射到 0~100（target=满分线） */
function scoreHigher(value: number, target: number, floor: number): number {
  if (target <= 0) return 0;
  const raw = (value / target) * 100;
  return Math.max(0, Math.min(100, raw + floor));
}

/** 把单项「越低越好」的指标映射到 0~100（target=满分线） */
function scoreLower(value: number, target: number, hardLimit: number): number {
  if (value <= target) return 100;
  if (value >= hardLimit) return 0;
  // 线性扣分：target 处 100，hardLimit 处 0
  return Math.max(0, 100 - ((value - target) / (hardLimit - target)) * 100);
}

/** 状态分档 */
function statusOf(score: number): DimensionScore['status'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'warn';
  return 'risk';
}

/**
 * 【自学习与数字孪生】expandHospitalBrain —— 把粗粒度运行指标扩展为
 * 四大维度的可读评分，并指出哪个子指标在拖后腿（不是「建议关注」）。
 *
 * 纯函数：仅由 ExpandedMetrics 决定输出，无 I/O。
 */
export function expandHospitalBrain(metrics: ExpandedMetrics): ExpandedBrain {
  // ---- 医疗质量：甲级病历率 40% + 并发症率 30% + 院感率 30% ----
  const qA1 = scoreHigher(metrics.recordA1Rate, 95, 0);
  const qComp = scoreLower(metrics.surgeryComplicationRate, 1.5, 4.0);
  const qInf = scoreLower(metrics.infectionRate, 2.0, 5.0);
  const qualityScore = Math.round(qA1 * 0.4 + qComp * 0.3 + qInf * 0.3);
  const qDrags: DimensionScore['drags'] = [];
  if (metrics.recordA1Rate < 90)
    qDrags.push({ name: '甲级病历率', value: metrics.recordA1Rate, target: '≥ 90%' });
  if (metrics.surgeryComplicationRate > 1.5)
    qDrags.push({ name: '手术并发症率', value: metrics.surgeryComplicationRate, target: '≤ 1.5%' });
  if (metrics.infectionRate > 2.0)
    qDrags.push({ name: '院感率', value: metrics.infectionRate, target: '≤ 2.0%' });

  // ---- 运营效率：床位周转 40% + 平均住院日 30% + 等待时间 30% ----
  const eTurn = scoreHigher(metrics.bedTurnover, 1.4, 0);
  const eLos = scoreLower(metrics.avgLOS, 8.5, 14);
  const eWait = scoreLower(metrics.avgWaitMinutes, 30, 90);
  const efficiencyScore = Math.round(eTurn * 0.4 + eLos * 0.3 + eWait * 0.3);
  const eDrags: DimensionScore['drags'] = [];
  if (metrics.bedTurnover < 1.2)
    eDrags.push({ name: '床位周转率', value: metrics.bedTurnover, target: '≥ 1.2 次/周' });
  if (metrics.avgLOS > 8.5)
    eDrags.push({ name: '平均住院日', value: metrics.avgLOS, target: '≤ 8.5 天' });
  if (metrics.avgWaitMinutes > 30)
    eDrags.push({ name: '平均等待时间', value: metrics.avgWaitMinutes, target: '≤ 30 分钟' });

  // ---- 患者体验：满意度 40% + NPS 30% + 投诉率 15% + 表扬率 15% ----
  const xSat = scoreHigher(metrics.satisfaction, 95, 0);
  // NPS 归一化：-100→0 分，30→100 分
  const xNps = Math.max(0, Math.min(100, ((metrics.nps + 100) / 130) * 100));
  const xComp = scoreLower(metrics.complaintRate, 1.0, 5.0);
  const xPraise = scoreHigher(metrics.praiseRate, 3.0, 0);
  const experienceScore = Math.round(xSat * 0.4 + xNps * 0.3 + xComp * 0.15 + xPraise * 0.15);
  const xDrags: DimensionScore['drags'] = [];
  if (metrics.satisfaction < 92)
    xDrags.push({ name: '满意度', value: metrics.satisfaction, target: '≥ 92%' });
  if (metrics.nps < 30) xDrags.push({ name: 'NPS', value: metrics.nps, target: '≥ 30' });
  if (metrics.complaintRate > 1.0)
    xDrags.push({ name: '投诉率', value: metrics.complaintRate, target: '≤ 1.0‰' });
  if (metrics.praiseRate < 2.0)
    xDrags.push({ name: '表扬率', value: metrics.praiseRate, target: '≥ 2.0‰' });

  // ---- 财务健康：利润率 60% + DRG 结余 40% ----
  const profitMargin = metrics.revenueWan > 0 ? (metrics.profitWan / metrics.revenueWan) * 100 : 0;
  // 利润率：-5%（亏损硬线）→ 0 分，8%（目标）→ 100 分，线性插值
  const fMargin = Math.max(0, Math.min(100, ((profitMargin + 5) / 13) * 100));
  // DRG 结余：≥0 满分，-50 万→0 分
  const fDrg = Math.max(0, Math.min(100, ((metrics.drgSurplusWan + 50) / 50) * 100));
  const financeScore = Math.round(fMargin * 0.6 + fDrg * 0.4);
  const fDrags: DimensionScore['drags'] = [];
  if (profitMargin < 8)
    fDrags.push({ name: '结余率', value: Math.round(profitMargin * 10) / 10, target: '≥ 8%' });
  if (metrics.drgSurplusWan < 0)
    fDrags.push({ name: 'DRG 结余', value: metrics.drgSurplusWan, target: '≥ 0 万元' });

  const dimensions: DimensionScore[] = [
    {
      key: 'quality',
      label: '医疗质量',
      score: qualityScore,
      status: statusOf(qualityScore),
      gap: qDrags.length === 0 ? '各子指标均达标' : `拖累项：${qDrags.map((d) => d.name).join('、')}`,
      drags: qDrags,
    },
    {
      key: 'efficiency',
      label: '运营效率',
      score: efficiencyScore,
      status: statusOf(efficiencyScore),
      gap: eDrags.length === 0 ? '各子指标均达标' : `拖累项：${eDrags.map((d) => d.name).join('、')}`,
      drags: eDrags,
    },
    {
      key: 'experience',
      label: '患者体验',
      score: experienceScore,
      status: statusOf(experienceScore),
      gap: xDrags.length === 0 ? '各子指标均达标' : `拖累项：${xDrags.map((d) => d.name).join('、')}`,
      drags: xDrags,
    },
    {
      key: 'finance',
      label: '财务健康',
      score: financeScore,
      status: statusOf(financeScore),
      gap: fDrags.length === 0 ? '各子指标均达标' : `拖累项：${fDrags.map((d) => d.name).join('、')}`,
      drags: fDrags,
    },
  ];

  // 四维加权：质量 35% / 效率 25% / 体验 20% / 财务 20%（符合三级国考权重）
  const brainIndex = Math.round(qualityScore * 0.35 + efficiencyScore * 0.25 + experienceScore * 0.2 + financeScore * 0.2);
  const level: ExpandedBrain['level'] = brainIndex >= 85 ? 'A' : brainIndex >= 70 ? 'B' : brainIndex >= 55 ? 'C' : 'D';

  return {
    generatedAt: new Date().toISOString(),
    demo: true,
    hospital: { code: 'HQ', name: '杭州健澜示范医院' },
    brainIndex,
    level,
    dimensions,
    profitMargin: Math.round(profitMargin * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// M170-C 单指标历史点（与 M159-A HistoryPoint 解耦，通用）
// ---------------------------------------------------------------------------

/** 单指标历史点 */
export interface MetricSeriesPoint {
  date: string;
  value: number;
}

/** predictMetricTrend 输出 */
export interface MetricTrendForecast {
  metric: string;
  horizonDays: number;
  /** 日斜率（每天变化多少） */
  slopePerDay: number;
  /** 趋势方向 */
  direction: 'up' | 'down' | 'flat';
  /** 拟合优度 R²（0~1） */
  r2: number;
  /** 预测序列（含起止日期） */
  series: { date: string; value: number }[];
}

// ---------------------------------------------------------------------------
// M170-C 纯函数 2：predictMetricTrend——单指标趋势预测
// ---------------------------------------------------------------------------

/** 皮尔逊相关系数（内部用） */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] ?? 0;
    const y = ys[i] ?? 0;
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
    syy += y * y;
  }
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

/**
 * 【自学习与数字孪生】predictMetricTrend —— 基于历史序列最小二乘外推
 * 未来 N 天，并给出方向 / 斜率 / R²（让前端能画「置信带」而不是拍脑袋）。
 *
 * @param metric 指标名（仅用于回显）
 * @param history 历史序列（按日期升序）
 * @param days 预测天数
 */
export function predictMetricTrend(
  metric: string,
  history: MetricSeriesPoint[],
  days: number,
): MetricTrendForecast {
  const horizon = Math.max(1, Math.min(30, Math.floor(days)));
  if (history.length < 2) {
    return {
      metric,
      horizonDays: horizon,
      slopePerDay: 0,
      direction: 'flat',
      r2: 0,
      series: [],
    };
  }

  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map((p) => p.value);
  const fit = linearFit(ys);
  // R² = (corr)^2
  const r = pearson(xs, ys);
  const r2 = Math.round(r * r * 1000) / 1000;

  const direction: MetricTrendForecast['direction'] =
    Math.abs(fit.slope) < Math.max(0.001, Math.abs(fit.intercept) * 0.005)
      ? 'flat'
      : fit.slope > 0
        ? 'up'
        : 'down';

  const lastDate = history[n - 1]?.date ?? formatDate(new Date());
  const series: { date: string; value: number }[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const x = n - 1 + step;
    const v = fit.intercept + fit.slope * x;
    series.push({ date: addDays(lastDate, step), value: Math.round(v * 100) / 100 });
  }

  return {
    metric,
    horizonDays: horizon,
    slopePerDay: Math.round(fit.slope * 1000) / 1000,
    direction,
    r2,
    series,
  };
}

// ---------------------------------------------------------------------------
// M170-C 纯函数 3：correlateMetrics——跨指标关联分析
// ---------------------------------------------------------------------------

/** 一组多指标同期序列：key 为指标名，value 为按日期升序的序列 */
export type MetricPeriodSeries = Record<string, MetricSeriesPoint[]>;

/** 关联对输出 */
export interface MetricCorrelation {
  a: string;
  b: string;
  /** 皮尔逊 r ∈ [-1, 1] */
  r: number;
  /** 强度描述 */
  strength: 'strong' | 'moderate' | 'weak';
  /** 人话解释（同涨同跌 / 此消彼长） */
  interpretation: string;
  /** 可执行启示（不是「建议关注」） */
  implication: string;
}

/**
 * 【自学习与数字孪生】correlateMetrics —— 在 period 天窗口内扫描所有指标对，
 * 只保留 |r| ≥ 0.5 的显著关联，并给出可执行启示。
 *
 * @param series 多指标同期序列
 * @param period 窗口天数（取最近 N 天）
 */
export function correlateMetrics(series: MetricPeriodSeries, period: number): MetricCorrelation[] {
  const window = Math.max(2, Math.floor(period));
  const keys = Object.keys(series);
  const result: MetricCorrelation[] = [];

  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const aKey = keys[i] ?? '';
      const bKey = keys[j] ?? '';
      const aAll = series[aKey] ?? [];
      const bAll = series[bKey] ?? [];
      if (aAll.length < 3 || bAll.length < 3) continue;

      // 取最近 window 天，按日期对齐
      const aWin = aAll.slice(-window);
      const bWin = bAll.slice(-window);
      const minLen = Math.min(aWin.length, bWin.length);
      const a = aWin.slice(-minLen).map((p) => p.value);
      const b = bWin.slice(-minLen).map((p) => p.value);
      const r = pearson(a, b);
      if (Math.abs(r) < 0.5) continue;

      const strength: MetricCorrelation['strength'] =
        Math.abs(r) >= 0.75 ? 'strong' : Math.abs(r) >= 0.5 ? 'moderate' : 'weak';
      const same = r > 0;
      const interpretation = same
        ? `「${aKey}」与「${bKey}」同向变动（r=${Math.round(r * 100) / 100}），一个升另一个也升`
        : `「${aKey}」与「${bKey}」反向变动（r=${Math.round(r * 100) / 100}），一个升另一个反降`;

      // 可执行启示：基于已知指标语义库
      const implication = buildImplication(aKey, bKey, same);

      result.push({ a: aKey, b: bKey, r: Math.round(r * 1000) / 1000, strength, interpretation, implication });
    }
  }

  // 按 |r| 降序
  result.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  return result;
}

/** 基于指标语义库给关联对配可执行启示 */
function buildImplication(a: string, b: string, same: boolean): string {
  const pair = [a, b].sort().join('|');
  // 常见高价值组合
  if (pair.includes('avgLOS') && pair.includes('bedTurnover')) {
    // r<0（反向）：平均住院日拉长直接压周转——最常见的联动，应压缩在院日
    // r>0（同向）：住院日升但周转也升——收治跑赢出院，警惕床位隐性积压
    return same
      ? '平均住院日与床位周转率同向上升：收治跑赢出院，警惕床位隐性积压与排队入院'
      : '平均住院日上升伴随床位周转下降：应启动「日间手术 + 预住院」压缩在院日，释放床位';
  }
  if (pair.includes('satisfaction') && pair.includes('complaintRate')) {
    return same
      ? '满意度与投诉率同向：说明投诉集中在特定科室/流程，应按科室拆投诉热力图'
      : '满意度上升同时投诉下降：体验改进有效，可复制该科室流程到全院';
  }
  if (pair.includes('profitWan') && pair.includes('drgSurplusWan')) {
    return same
      ? '结余与 DRG 结余同向：DRG 控费策略直接改善全院结余，应继续规范病案首页填写'
      : '结余上升但 DRG 超支：收入增长可能来自自费项目，需警惕病组结构恶化';
  }
  if (pair.includes('bedTurnover') && pair.includes('avgWaitMinutes')) {
    return same
      ? '周转加快但等待变长：床位被快速轮转消耗，需增开诊室或检查通道'
      : '周转加快等待仍短：流程优化见效，沉淀经验做法';
  }
  if (pair.includes('nps') && pair.includes('praiseRate')) {
    return same ? 'NPS 与表扬率同向：患者自发口碑增强，可把表扬案例用于新媒体传播' : '表扬多但 NPS 低：可能是抽样偏差，应扩大 NPS 调研样本';
  }
  // 兜底：通用启示
  return same
    ? `「${a}」与「${b}」强同向：任一指标异常都会传导到另一指标，应联动排班与物资预算`
    : `「${a}」与「${b}」强反向：调整一个指标时必须同步评估另一个的副作用`;
}

// ---------------------------------------------------------------------------
// M170-C 纯函数 4：generateBrainInsight——大脑洞察生成（可执行）
// ---------------------------------------------------------------------------

/** 单条洞察 */
export interface BrainInsight {
  id: string;
  dimension: DimensionKey;
  priority: 'high' | 'medium' | 'low';
  /** 结论标题（一句话） */
  title: string;
  /** 证据链 */
  evidence: string[];
  /** 可执行动作（谁、做什么） */
  action: string;
  /** 预期收益（量化） */
  expectedImpact: string;
}

/**
 * 【自学习与数字孪生】generateBrainInsight —— 基于四大维度指标 + 关联分析
 * 产出可执行洞察。每条洞察都必须有「动作 + 量化收益」，不允许「建议关注」。
 *
 * @param metrics 当前扩展指标快照
 * @param correlations correlateMetrics 的输出
 */
export function generateBrainInsight(
  metrics: ExpandedMetrics,
  correlations: MetricCorrelation[],
): BrainInsight[] {
  const insights: BrainInsight[] = [];
  const push = (insight: BrainInsight) => insights.push(insight);

  // ---- 1. 医疗质量 ----
  if (metrics.recordA1Rate < 90) {
    push({
      id: 'INS-Q-A1',
      dimension: 'quality',
      priority: metrics.recordA1Rate < 85 ? 'high' : 'medium',
      title: `甲级病历率 ${metrics.recordA1Rate}%，低于 90% 国考线`,
      evidence: [
        `当前甲级病历率 ${metrics.recordA1Rate}%`,
        `国考三级医院要求 ≥ 90%，距目标差 ${Math.round((90 - metrics.recordA1Rate) * 10) / 10} 个百分点`,
      ],
      action: '质控科下周起每日抽取运行病历 30 份，重点查现病史与诊疗计划完整性；信息科上线病历书写实时校验规则',
      expectedImpact: '预计 4 周内甲级病历率回升至 92%，避免国考扣分 2~3 分',
    });
  }
  if (metrics.surgeryComplicationRate > 1.5) {
    push({
      id: 'INS-Q-COMP',
      dimension: 'quality',
      priority: 'high',
      title: `手术并发症率 ${metrics.surgeryComplicationRate}%，超过 1.5% 警戒线`,
      evidence: [`当前 ${metrics.surgeryComplicationRate}%`, `安全目标 ≤ 1.5%`],
      action: '医务处组织普外科/骨科近 30 天并发症病例 MDT 复盘，麻醉科核对术前评估遗漏项',
      expectedImpact: '预计 6 周内并发症率回落至 1.2%，减少术后 ICU 滞留 15~20 例/月',
    });
  }

  // ---- 2. 运营效率 ----
  if (metrics.avgLOS > 8.5) {
    push({
      id: 'INS-E-LOS',
      dimension: 'efficiency',
      priority: metrics.avgLOS > 10 ? 'high' : 'medium',
      title: `平均住院日 ${metrics.avgLOS} 天，高于 8.5 天目标`,
      evidence: [
        `当前平均住院日 ${metrics.avgLOS} 天`,
        `与目标差 ${Math.round((metrics.avgLOS - 8.5) * 10) / 10} 天`,
        `床位周转率 ${metrics.bedTurnover} 次/周`,
      ],
      action: '医务处筛选平均住院日前 10 的科室，推行「预住院 + 日间手术」；出院前 48 小时启动随访衔接',
      expectedImpact: '每压缩 0.5 天住院日，相当于新增床位 ≈ 80 张/年，释放收益约 600 万元/年',
    });
  }
  if (metrics.avgWaitMinutes > 30) {
    push({
      id: 'INS-E-WAIT',
      dimension: 'efficiency',
      priority: 'medium',
      title: `平均等待时间 ${metrics.avgWaitMinutes} 分钟，超过 30 分钟`,
      evidence: [`当前平均等待 ${metrics.avgWaitMinutes} 分钟`],
      action: '门诊部高峰时段（9:00-10:30）增开 2 个机动诊室；检查科室推行分时段预约精确到 15 分钟',
      expectedImpact: '预计平均等待降至 22 分钟，满意度提升 3~5 个百分点',
    });
  }

  // ---- 3. 患者体验 ----
  if (metrics.nps < 30) {
    push({
      id: 'INS-X-NPS',
      dimension: 'experience',
      priority: metrics.nps < 10 ? 'high' : 'medium',
      title: `NPS ${metrics.nps}，低于 30 分良好线`,
      evidence: [`当前 NPS ${metrics.nps}`, `投诉率 ${metrics.complaintRate}‰`, `表扬率 ${metrics.praiseRate}‰`],
      action: '患者服务中心对近 30 天贬损者（0~6 分）100% 电话回访；对推荐者（9~10 分）邀请参与口碑计划',
      expectedImpact: 'NPS 每提升 10 分，患者流失率下降约 4%，相当于年门诊量多 8000~10000 人次',
    });
  }
  if (metrics.complaintRate > 1.0) {
    push({
      id: 'INS-X-COMP',
      dimension: 'experience',
      priority: 'high',
      title: `投诉率 ${metrics.complaintRate}‰，超过 1.0‰ 警戒线`,
      evidence: [`当前投诉率 ${metrics.complaintRate}‰`],
      action: '投诉办按周拆解投诉到科室与环节（挂号/候诊/收费/诊疗），TOP3 科室科主任在院周会做整改汇报',
      expectedImpact: '投诉率回落至 0.8‰，差评舆情风险显著下降',
    });
  }

  // ---- 4. 财务健康 ----
  const profitMargin = metrics.revenueWan > 0 ? (metrics.profitWan / metrics.revenueWan) * 100 : 0;
  if (metrics.drgSurplusWan < 0) {
    push({
      id: 'INS-F-DRG',
      dimension: 'finance',
      priority: 'high',
      title: `DRG 月超支 ${Math.abs(metrics.drgSurplusWan)} 万元`,
      evidence: [
        `DRG 结余 ${metrics.drgSurplusWan} 万元`,
        `全院结余率 ${Math.round(profitMargin * 10) / 10}%`,
      ],
      action: '医保办联合病案室复盘超支病组 TOP5，重点核查病案首页主要诊断选择与耗材使用；对超支病组临床路径逐项核定',
      expectedImpact: '若 50% 超支病组回到标准线，每月可回补 20~30 万元，季度 DRG 考核不扣分',
    });
  }
  if (profitMargin < 0) {
    push({
      id: 'INS-F-MARGIN',
      dimension: 'finance',
      priority: 'high',
      title: `月度结余率 ${Math.round(profitMargin * 10) / 10}%，已亏损`,
      evidence: [`收入 ${metrics.revenueWan} 万 / 成本 ${metrics.costWan} 万 / 结余 ${metrics.profitWan} 万`],
      action: '运营管理委员会启动月度成本分析会，对百元收入占比超基线的耗材与药品做专项管控；优化人力排班结构',
      expectedImpact: '成本压降 2% 即可扭亏为盈，释放约 50~80 万元/月',
    });
  }

  // ---- 5. 跨维度关联洞察（来自 correlateMetrics）----
  for (const c of correlations.slice(0, 3)) {
    if (c.strength !== 'strong') continue;
    push({
      id: `INS-C-${c.a}-${c.b}`,
      dimension: 'finance', // 跨维度洞察统一挂到 finance 下做运营决策
      priority: c.strength === 'strong' ? 'medium' : 'low',
      title: `强关联：${c.a} 与 ${c.b}（r=${c.r}）`,
      evidence: [c.interpretation, `最近 ${correlations.length} 组显著关联中排名前列`],
      action: c.implication,
      expectedImpact: '联动调整可避免单一指标优化带来的副作用，按经验可提升整体效率 5%~10%',
    });
  }

  // 优先级排序：high → medium → low
  const w: Record<BrainInsight['priority'], number> = { high: 0, medium: 1, low: 2 };
  insights.sort((x, y) => w[x.priority] - w[y.priority]);
  return insights;
}

// ---------------------------------------------------------------------------
// M170-C 演示数据装配（路由用；纯函数、确定性 seed）
// ---------------------------------------------------------------------------

/** 构造 M170-C 演示扩展指标（带明显问题：DRG 超支、平均住院日偏长、NPS 偏低） */
export function buildExpandedDemo(): {
  metrics: ExpandedMetrics;
  history: Record<string, MetricSeriesPoint[]>;
} {
  const metrics: ExpandedMetrics = {
    recordA1Rate: 86.5,
    surgeryComplicationRate: 1.8,
    infectionRate: 1.6,
    bedTurnover: 1.05,
    avgLOS: 9.6,
    avgWaitMinutes: 38,
    satisfaction: 88.4,
    nps: 12,
    complaintRate: 1.6,
    praiseRate: 1.2,
    revenueWan: 4200,
    costWan: 3980,
    profitWan: 220,
    drgSurplusWan: -35,
  };

  // 30 天历史：平均住院日缓慢上升，床位周转缓慢下降（强反向相关）
  const history: Record<string, MetricSeriesPoint[]> = {
    avgLOS: [],
    bedTurnover: [],
    satisfaction: [],
    complaintRate: [],
    drgSurplusWan: [],
    profitWan: [],
  };
  const today = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = formatDate(d);
    // avgLOS 从 8.8 缓慢升到 9.6；bedTurnover 从 1.2 降到 1.05（反向强相关）
    history.avgLOS.push({ date, value: Math.round((8.8 + (29 - i) * 0.028) * 100) / 100 });
    history.bedTurnover.push({ date, value: Math.round((1.2 - (29 - i) * 0.005) * 100) / 100 });
    // satisfaction 缓升、complaintRate 缓降（反向）
    history.satisfaction.push({ date, value: Math.round((86 + (29 - i) * 0.08) * 10) / 10 });
    history.complaintRate.push({ date, value: Math.round((2.0 - (29 - i) * 0.014) * 100) / 100 });
    // drgSurplusWan 与 profitWan 同向波动
    history.drgSurplusWan.push({ date, value: Math.round((-40 + Math.sin(i / 4) * 8) * 10) / 10 });
    history.profitWan.push({ date, value: Math.round((180 + Math.sin(i / 4) * 25) * 10) / 10 });
  }

  return { metrics, history };
}
