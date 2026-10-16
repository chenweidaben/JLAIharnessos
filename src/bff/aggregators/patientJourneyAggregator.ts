/**
 * 健澜科技 jlmedaios - 【AI深化与智能运营】患者全旅程聚合器（纯函数）
 *
 * 患者旅程要真实，不能虚构：门诊一次就诊天然走完八个节点——
 *   预约挂号 → 分诊候诊 → 就诊 → 开单缴费 → 检查检验 → 取药 → 离院 → 随访
 * 本模块把散落各系统的节点事件重放为一条患者时间线，并回答四个运营问题：
 *
 *   - buildPatientJourney：按患者+时段重建全旅程时间线，
 *     每个节点到达状态/等待/服务时长，累计等待与总在院时长；
 *   - identifyJourneyBottleneck：把各节点实际等待与门诊基准对比，
 *     找出「患者真正卡住的环节」，超出基准越多优先级越高；
 *   - optimizePatientFlow：针对瓶颈节点给出可落地的流程优化动作
 *     （分时段预约/诊间结算/检查集中预约/前置摆药），并估算可释放等待；
 *   - predictPatientSatisfaction：基于旅程时长、瓶颈与随访完成情况
 *     预测满意度区间与投诉风险，不拿问卷结果倒推，只做前瞻提示。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/patientJourney.ts）负责。
 *
 * 医疗安全：本模块为门诊运营改进辅助，不影响临床诊疗决策；
 *           瓶颈与满意度预测不用于考核一线人员扣罚，只用于流程改造。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 【AI深化与智能运营】八个旅程节点（固定顺序，与 patient_journey_event 枚举对齐） */
export type JourneyNodeCode =
  | 'appointment'
  | 'triaging'
  | 'consultation'
  | 'billing'
  | 'exam'
  | 'pharmacy'
  | 'discharge'
  | 'followup';

/** 节点事件状态 */
export type JourneyEventStatus = 'completed' | 'skipped' | 'in_progress';

/** 原始旅程事件输入（一行 = 一个节点的一次签到/完成） */
export interface PatientJourneyEvent {
  /** 事件业务 ID */
  eventId: string;
  /** 患者就诊业务号 */
  patientId: string;
  /** 一次就诊流水号 */
  visitId: string;
  /** 节点编码 */
  nodeCode: JourneyNodeCode;
  /** 该节点发生时间（ISO 字符串） */
  occurredAt: string;
  /** 该节点前/节点内排队等待（分钟） */
  waitMinutes: number;
  /** 该节点实际服务时长（分钟） */
  durationMinutes: number;
  /** 完成状态 */
  status: JourneyEventStatus;
  /** 脱敏备注（如「超声设备临时故障」） */
  note?: string;
}

/** 查询时段 */
export interface JourneyPeriod {
  from: string; // ISO 日期/时间
  to: string; // ISO 日期/时间
}

/** 时间线上的一个节点 */
export interface JourneyStage {
  nodeCode: JourneyNodeCode;
  nodeName: string;
  /** 该节点在时段内是否有事件（未到达 = 流程尚未走到/跳过） */
  reached: boolean;
  /** 该节点基准等待（门诊真实基准，分钟） */
  benchmarkWaitMinutes: number;
  waitMinutes: number;
  durationMinutes: number;
  status: JourneyEventStatus | 'pending';
  occurredAt: string | null;
  note: string;
}

/** buildPatientJourney 输出：一条患者全旅程时间线 */
export interface PatientJourney {
  patientId: string;
  period: JourneyPeriod;
  visitId: string;
  stages: JourneyStage[];
  /** 已到达节点数（含跳过） */
  reachedCount: number;
  /** 完成节点数 */
  completedCount: number;
  /** 在首末到达节点之间、缺失未走的节点（流程断环） */
  skippedBetween: JourneyNodeCode[];
  /** 当前仍在进行中的节点（患者还在院） */
  currentNode: JourneyNodeCode | null;
  /** 等待总时长（分钟，八节点等待之和） */
  totalWaitMinutes: number;
  /** 首末事件之间的总在院/在途时长（分钟） */
  totalElapsedMinutes: number;
  /** 随访是否已完成（离院后关怀闭环） */
  followupCompleted: boolean;
}

/** 旅程瓶颈条目 */
export interface JourneyBottleneck {
  nodeCode: JourneyNodeCode;
  nodeName: string;
  waitMinutes: number;
  benchmarkWaitMinutes: number;
  /** 超出基准的等待（分钟） */
  excessMinutes: number;
  /** 严重度：high（≥60 分钟或超基准 1 倍）/ medium（超基准 20%）/ low */
  severity: 'high' | 'medium' | 'low';
  /** 客观描述（事实，不指责人） */
  reason: string;
  /** 改进建议 */
  suggestion: string;
}

/** identifyJourneyBottleneck 输出 */
export interface JourneyBottleneckReport {
  patientId: string;
  visitId: string;
  /** 按超出基准的等待从大到小排序 */
  bottlenecks: JourneyBottleneck[];
  /** 最严重节点 */
  worstNode: JourneyBottleneck | null;
  summary: {
    avgWaitMinutes: number;
    overBenchmarkCount: number;
  };
}

/** 单条流程优化建议 */
export interface FlowRecommendation {
  nodeCode: JourneyNodeCode;
  nodeName: string;
  /** 优化动作（可落地，不空喊口号） */
  action: string;
  /** 预计可释放的等待（分钟） */
  estimatedWaitSavedMinutes: number;
  /** 预计满意度提升（分，0-100 制） */
  expectedSatisfactionLift: number;
  priority: 'high' | 'medium' | 'low';
}

/** optimizePatientFlow 输出 */
export interface FlowOptimization {
  recommendations: FlowRecommendation[];
  /** 全部建议合计可释放等待（分钟） */
  totalEstimatedWaitSavedMinutes: number;
  /** 整体优先级：任一 high 即 high */
  overallPriority: 'high' | 'medium' | 'low';
}

/** predictPatientSatisfaction 输出 */
export interface SatisfactionPrediction {
  /** 预测满意度 0-100 */
  predictedScore: number;
  /** 档位：excellent / good / fair / poor / unknown（无数据不预测） */
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  /** 投诉风险：low / medium / high */
  risk: 'low' | 'medium' | 'high';
  positiveFactors: string[];
  negativeFactors: string[];
  /** 预测置信度：已完成节点越多越可信 */
  confidence: 'high' | 'medium' | 'low';
}

/* ============================== 基准常量 ============================== */

/**
 * 【AI深化与智能运营】八节点顺序与门诊真实基准。
 * 基准等待来自国内三甲门诊常态运营口径：候诊约 30 分钟、缴费/取药排队
 * 约 10 分钟、检查检验（等叫号+采样+等报告）约 45 分钟；
 * 预约挂号与离院为流程动作，随访为离院后动作，基准等待记 0。
 */
export const JOURNEY_NODES: ReadonlyArray<{
  code: JourneyNodeCode;
  name: string;
  benchmarkWaitMinutes: number;
}> = [
  { code: 'appointment', name: '预约挂号', benchmarkWaitMinutes: 0 },
  { code: 'triaging', name: '分诊候诊', benchmarkWaitMinutes: 30 },
  { code: 'consultation', name: '就诊', benchmarkWaitMinutes: 0 },
  { code: 'billing', name: '开单缴费', benchmarkWaitMinutes: 10 },
  { code: 'exam', name: '检查检验', benchmarkWaitMinutes: 45 },
  { code: 'pharmacy', name: '取药', benchmarkWaitMinutes: 10 },
  { code: 'discharge', name: '离院', benchmarkWaitMinutes: 0 },
  { code: 'followup', name: '随访', benchmarkWaitMinutes: 0 },
];

const NODE_NAME: Record<JourneyNodeCode, string> = Object.fromEntries(
  JOURNEY_NODES.map((n) => [n.code, n.name]),
) as Record<JourneyNodeCode, string>;

/* ============================== 演示种子事件 ============================== */

/**
 * 演示患者旅程事件（真实门诊节奏：上午号源，候诊偏久、检查排队最久）。
 * 断库时由路由层内存台账回读；接入 PG 后以 medmuse.patient_journey_event 为准。
 */
export const SEED_JOURNEY_EVENTS: PatientJourneyEvent[] = [
  // 患者 P-2026101201：2026-10-12 上午门诊（候诊/检查为真实痛点场景）
  { eventId: 'e-a1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'appointment', occurredAt: '2026-10-12T08:00:00+08:00', waitMinutes: 0, durationMinutes: 2, status: 'completed', note: '线上预约 08:30 号' },
  { eventId: 'e-t1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'triaging', occurredAt: '2026-10-12T08:32:00+08:00', waitMinutes: 40, durationMinutes: 5, status: 'completed', note: '签到后候诊至 09:10 叫号' },
  { eventId: 'e-c1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'consultation', occurredAt: '2026-10-12T09:10:00+08:00', waitMinutes: 0, durationMinutes: 12, status: 'completed' },
  { eventId: 'e-b1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'billing', occurredAt: '2026-10-12T09:22:00+08:00', waitMinutes: 8, durationMinutes: 2, status: 'completed' },
  { eventId: 'e-x1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'exam', occurredAt: '2026-10-12T09:30:00+08:00', waitMinutes: 65, durationMinutes: 25, status: 'completed', note: '超声排队 + 等报告' },
  { eventId: 'e-p1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'pharmacy', occurredAt: '2026-10-12T11:00:00+08:00', waitMinutes: 12, durationMinutes: 3, status: 'completed' },
  { eventId: 'e-d1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'discharge', occurredAt: '2026-10-12T11:05:00+08:00', waitMinutes: 0, durationMinutes: 3, status: 'completed' },
  { eventId: 'e-f1', patientId: 'P-2026101201', visitId: 'V-20261012-01', nodeCode: 'followup', occurredAt: '2026-10-14T10:00:00+08:00', waitMinutes: 0, durationMinutes: 10, status: 'completed', note: '电话随访服药情况' },
  // 患者 P-2026101301：流程顺畅对照组（分时段预约 + 诊间结算）
  { eventId: 'e-a2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'appointment', occurredAt: '2026-10-13T09:00:00+08:00', waitMinutes: 0, durationMinutes: 2, status: 'completed' },
  { eventId: 'e-t2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'triaging', occurredAt: '2026-10-13T09:18:00+08:00', waitMinutes: 12, durationMinutes: 4, status: 'completed' },
  { eventId: 'e-c2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'consultation', occurredAt: '2026-10-13T09:30:00+08:00', waitMinutes: 0, durationMinutes: 10, status: 'completed' },
  { eventId: 'e-b2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'billing', occurredAt: '2026-10-13T09:40:00+08:00', waitMinutes: 0, durationMinutes: 1, status: 'completed', note: '诊间结算' },
  { eventId: 'e-x2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'exam', occurredAt: '2026-10-13T09:45:00+08:00', waitMinutes: 30, durationMinutes: 20, status: 'completed' },
  { eventId: 'e-p2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'pharmacy', occurredAt: '2026-10-13T10:20:00+08:00', waitMinutes: 6, durationMinutes: 2, status: 'completed' },
  { eventId: 'e-d2', patientId: 'P-2026101301', visitId: 'V-20261013-01', nodeCode: 'discharge', occurredAt: '2026-10-13T10:25:00+08:00', waitMinutes: 0, durationMinutes: 2, status: 'completed' },
];

/* ============================== 内部工具 ============================== */

/** 取某节点在事件列表中最新一条（同节点重复签到以最后一次为准） */
function latestEventForNode(
  events: PatientJourneyEvent[],
  code: JourneyNodeCode,
): PatientJourneyEvent | null {
  const matched = events.filter((e) => e.nodeCode === code);
  if (matched.length === 0) return null;
  return matched.reduce((a, b) =>
    new Date(a.occurredAt).getTime() >= new Date(b.occurredAt).getTime() ? a : b,
  );
}

/** 时段过滤：事件 occurredAt 落在 [from, to] 内（闭区间） */
function inPeriod(occurredAt: string, period: JourneyPeriod): boolean {
  const t = new Date(occurredAt).getTime();
  const from = new Date(period.from).getTime();
  const to = new Date(period.to).getTime();
  return t >= from && t <= to;
}

/** 默认时段：最近 30 天（以传入参考日为锚，保持纯函数可测） */
export function defaultPeriod(referenceNow: string): JourneyPeriod {
  const now = new Date(referenceNow);
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: now.toISOString() };
}

/* ============================== 纯函数一：旅程构建 ============================== */

/**
 * buildPatientJourney：按患者 + 时段重建全旅程时间线。
 * events 缺省取演示种子（断库回读）；生产环境由路由层传入台账事件。
 * 纯函数：不修改入参，不触库。
 */
export function buildPatientJourney(
  patientId: string,
  period: JourneyPeriod,
  events: PatientJourneyEvent[] = SEED_JOURNEY_EVENTS,
): PatientJourney {
  const mine = events.filter(
    (e) => e.patientId === patientId && inPeriod(e.occurredAt, period),
  );

  const stages: JourneyStage[] = JOURNEY_NODES.map((node) => {
    const ev = latestEventForNode(mine, node.code);
    return {
      nodeCode: node.code,
      nodeName: node.name,
      reached: ev !== null,
      benchmarkWaitMinutes: node.benchmarkWaitMinutes,
      waitMinutes: ev?.waitMinutes ?? 0,
      durationMinutes: ev?.durationMinutes ?? 0,
      status: ev?.status ?? 'pending',
      occurredAt: ev?.occurredAt ?? null,
      note: ev?.note ?? '',
    };
  });

  const reachedIdx = stages
    .map((s, i) => (s.reached ? i : -1))
    .filter((i) => i >= 0);
  const firstIdx = reachedIdx.length > 0 ? Math.min(...reachedIdx) : -1;
  const lastIdx = reachedIdx.length > 0 ? Math.max(...reachedIdx) : -1;

  // 流程断环：首末到达节点之间缺失的节点（首末之间没走到 = 跳环）
  const skippedBetween: JourneyNodeCode[] = [];
  if (firstIdx >= 0 && lastIdx >= 0) {
    for (let i = firstIdx; i <= lastIdx; i += 1) {
      if (!stages[i].reached) skippedBetween.push(stages[i].nodeCode);
    }
  }

  const currentStage = stages.find((s) => s.status === 'in_progress') ?? null;
  const reachedEvents = mine;
  const times = reachedEvents
    .map((e) => new Date(e.occurredAt).getTime())
    .filter((t) => !Number.isNaN(t));

  const totalWaitMinutes = Math.round(
    stages.reduce((sum, s) => sum + s.waitMinutes, 0),
  );
  const totalElapsedMinutes =
    times.length >= 2
      ? Math.round((Math.max(...times) - Math.min(...times)) / 60000)
      : 0;

  return {
    patientId,
    period,
    visitId: reachedEvents[0]?.visitId ?? '',
    stages,
    reachedCount: reachedIdx.length,
    completedCount: stages.filter((s) => s.status === 'completed').length,
    skippedBetween,
    currentNode: currentStage?.nodeCode ?? null,
    totalWaitMinutes,
    totalElapsedMinutes,
    followupCompleted:
      stages.find((s) => s.nodeCode === 'followup')?.status === 'completed',
  };
}

/* ============================== 纯函数二：瓶颈识别 ============================== */

/** 各节点超基准时的事实描述与改进建议（运营动作，不指责个人） */
const BOTTLENECK_ADVICE: Record<
  JourneyNodeCode,
  { suggestion: string }
> = {
  appointment: {
    suggestion: '线上号源提前 7 天放号并开放退号再放，减少跑空。',
  },
  triaging: {
    suggestion: '分时段预约精确到 30 分钟 + 诊前候诊提醒，高峰弹性加号、叫号大屏公示预计等待。',
  },
  consultation: {
    suggestion: '复诊号优先错峰排班，常见病引导互联网医院复诊。',
  },
  billing: {
    suggestion: '诊间结算与移动支付打通，患者免排队缴费。',
  },
  exam: {
    suggestion: '检查检验集中预约中心统一排程，超声/检验错峰并合并申请单，报告自助打印。',
  },
  pharmacy: {
    suggestion: '处方前置审核 + 智慧药房预摆药，患者到院即取。',
  },
  discharge: {
    suggestion: '结算与宣教前移到诊间，离院不折返。',
  },
  followup: {
    suggestion: '随访按病种自动排期，护士集中外呼，避免遗漏。',
  },
};

function severityOf(
  waitMinutes: number,
  benchmark: number,
): 'high' | 'medium' | 'low' {
  // 绝对等待 ≥60 分钟，或相对基准超出 1 倍 → high
  if (waitMinutes >= 60 || waitMinutes >= benchmark * 2) return 'high';
  // 超出基准 20% 以上 → medium
  if (waitMinutes >= benchmark * 1.2) return 'medium';
  return 'low';
}

/**
 * identifyJourneyBottleneck：把旅程各节点等待与门诊基准对比，
 * 只报告「超基准」的节点，按超出量从大到小排。
 */
export function identifyJourneyBottleneck(
  patientId: string,
  period: JourneyPeriod,
  events: PatientJourneyEvent[] = SEED_JOURNEY_EVENTS,
): JourneyBottleneckReport {
  const journey = buildPatientJourney(patientId, period, events);

  const bottlenecks: JourneyBottleneck[] = journey.stages
    .filter((s) => s.reached && s.benchmarkWaitMinutes > 0)
    .map((s) => {
      const excess = Math.round((s.waitMinutes - s.benchmarkWaitMinutes) * 10) / 10;
      return {
        nodeCode: s.nodeCode,
        nodeName: s.nodeName,
        waitMinutes: s.waitMinutes,
        benchmarkWaitMinutes: s.benchmarkWaitMinutes,
        excessMinutes: excess,
        severity: severityOf(s.waitMinutes, s.benchmarkWaitMinutes),
        reason: `${s.nodeName}等待 ${s.waitMinutes} 分钟，门诊基准 ${s.benchmarkWaitMinutes} 分钟，超出 ${excess} 分钟。`,
        suggestion: BOTTLENECK_ADVICE[s.nodeCode].suggestion,
      };
    })
    .filter((b) => b.excessMinutes > 0)
    .sort((a, b) => b.excessMinutes - a.excessMinutes);

  const avgWait =
    journey.totalWaitMinutes === 0
      ? 0
      : Math.round((journey.totalWaitMinutes / Math.max(journey.reachedCount, 1)) * 10) / 10;

  return {
    patientId,
    visitId: journey.visitId,
    bottlenecks,
    worstNode: bottlenecks[0] ?? null,
    summary: {
      avgWaitMinutes: avgWait,
      overBenchmarkCount: bottlenecks.length,
    },
  };
}

/* ============================== 纯函数三：流程优化 ============================== */

/**
 * optimizePatientFlow：基于已建好的旅程（或瓶颈报告）给出优化动作。
 * 估算口径：超基准等待的 60% 可通过流程改造释放（保守估计，不拍脑袋夸大）。
 */
export function optimizePatientFlow(
  journeyData: PatientJourney,
): FlowOptimization {
  const recommendations: FlowRecommendation[] = [];

  for (const stage of journeyData.stages) {
    if (!stage.reached || stage.benchmarkWaitMinutes <= 0) continue;
    const excess = stage.waitMinutes - stage.benchmarkWaitMinutes;
    if (excess <= 0) continue;

    const severity = severityOf(stage.waitMinutes, stage.benchmarkWaitMinutes);
    const saved = Math.round(excess * 0.6);
    recommendations.push({
      nodeCode: stage.nodeCode,
      nodeName: stage.nodeName,
      action: BOTTLENECK_ADVICE[stage.nodeCode].suggestion,
      estimatedWaitSavedMinutes: saved,
      // 等待越久满意度弹性越大：每释放 1 分钟约带回 0.4 分（封顶 8 分）
      expectedSatisfactionLift: Math.min(Math.round(saved * 0.4 * 10) / 10, 8),
      priority: severity,
    });
  }

  recommendations.sort((a, b) => b.estimatedWaitSavedMinutes - a.estimatedWaitSavedMinutes);

  if (recommendations.length === 0) {
    return {
      recommendations: [
        {
          nodeCode: 'appointment',
          nodeName: '全流程',
          action: '现有等待均在门诊基准内，保持分时段预约与诊间结算节奏，每月复盘一次等待时长。',
          estimatedWaitSavedMinutes: 0,
          expectedSatisfactionLift: 0,
          priority: 'low',
        },
      ],
      totalEstimatedWaitSavedMinutes: 0,
      overallPriority: 'low',
    };
  }

  const totalSaved = recommendations.reduce((s, r) => s + r.estimatedWaitSavedMinutes, 0);
  const overallPriority: 'high' | 'medium' | 'low' = recommendations.some(
    (r) => r.priority === 'high',
  )
    ? 'high'
    : recommendations.some((r) => r.priority === 'medium')
      ? 'medium'
      : 'low';

  return {
    recommendations,
    totalEstimatedWaitSavedMinutes: totalSaved,
    overallPriority,
  };
}

/* ============================== 纯函数四：满意度预测 ============================== */

/**
 * predictPatientSatisfaction：基于旅程事实预测满意度（0-100）。
 * 打分口径透明：
 *   基线 100 分；
 *   每个超基准等待节点：每超 1 分钟扣 0.5 分；
 *   每个流程断环节点扣 8 分；
 *   总在院时长 > 240 分钟扣 5 分（半日游体验差）；
 *   随访完成加 6 分（离院后关怀闭环是满意度杠杆）。
 * 无任何旅程数据时不硬猜：返回 unknown。
 */
export function predictPatientSatisfaction(
  journeyData: PatientJourney,
): SatisfactionPrediction {
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  if (journeyData.reachedCount === 0) {
    return {
      predictedScore: 0,
      level: 'unknown',
      risk: 'low',
      positiveFactors,
      negativeFactors: ['该患者在时段内无旅程事件，不做满意度预测'],
      confidence: 'low',
    };
  }

  let score = 100;

  for (const stage of journeyData.stages) {
    if (!stage.reached || stage.benchmarkWaitMinutes <= 0) continue;
    const excess = stage.waitMinutes - stage.benchmarkWaitMinutes;
    if (excess > 0) {
      const penalty = Math.round(excess * 0.5 * 10) / 10;
      score -= penalty;
      negativeFactors.push(
        `${stage.nodeName}等待 ${stage.waitMinutes} 分钟（基准 ${stage.benchmarkWaitMinutes} 分钟），扣 ${penalty} 分`,
      );
    } else if (stage.waitMinutes <= stage.benchmarkWaitMinutes) {
      positiveFactors.push(`${stage.nodeName}等待 ${stage.waitMinutes} 分钟，在基准内`);
    }
  }

  if (journeyData.skippedBetween.length > 0) {
    const penalty = journeyData.skippedBetween.length * 8;
    score -= penalty;
    negativeFactors.push(
      `流程断环：${journeyData.skippedBetween
        .map((c) => NODE_NAME[c])
        .join('、')} 节点缺失，扣 ${penalty} 分`,
    );
  }

  if (journeyData.totalElapsedMinutes > 240) {
    score -= 5;
    negativeFactors.push(`总在院 ${journeyData.totalElapsedMinutes} 分钟，超过 4 小时，扣 5 分`);
  }

  if (journeyData.followupCompleted) {
    score += 6;
    positiveFactors.push('离院后随访已完成，关怀闭环 +6 分');
  } else {
    negativeFactors.push('随访未完成，离院后关怀缺失');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const level: SatisfactionPrediction['level'] =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 55 ? 'fair' : 'poor';
  const risk: SatisfactionPrediction['risk'] =
    score < 55 ? 'high' : score < 70 ? 'medium' : 'low';
  const confidence: SatisfactionPrediction['confidence'] =
    journeyData.completedCount >= 7 ? 'high' : journeyData.completedCount >= 5 ? 'medium' : 'low';

  return {
    predictedScore: score,
    level,
    risk,
    positiveFactors,
    negativeFactors,
    confidence,
  };
}
