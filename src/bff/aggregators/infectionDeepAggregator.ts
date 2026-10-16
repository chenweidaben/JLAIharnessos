/**
 * 健澜科技 jlmedaios — 【护理院感医保药事】医院院感管理深化聚合器（M179-B，纯函数）
 *
 * 院感监测要真预警，不能等暴发：把「事后补登记」升级为「手卫生依从率每日可测、
 * 聚集发病 72h 窗自动标红、同源性一判即启动暴发处置」的闭环体系，四个纯函数各司其职：
 *
 *   - buildDeepInfectionMgmt：深度院感管理体系。一次盘点四大管理维度——
 *       ① 院感监测（手卫生 / 环境卫生 / 消毒灭菌 / 多重耐药菌 MDRO）；
 *       ② 院感病例（诊断 / 上报 / 流调 / 处置）；
 *       ③ 暴发预警（聚集性发病 / 同源性 / 暴发控制）；
 *       ④ 培训考核（院感知识 / 防护技能 / 考核合格）。
 *   - monitorHandHygiene：手卫生监测。按科室 × 周期统计五时刻依从率，
 *       目标 ≥95%（WS/T 313《医务人员手卫生规范》），不达标即列缺口时刻。
 *   - detectInfectionOutbreak：暴发识别。72h 窗内同科室病例数达阈值即聚集预警，
 *       叠加菌株同源性（同种同源）即判暴发疑似，输出隔离/流调/终末消毒/上报建议。
 *   - generateInfectionReport：院感报告。按周期输出四类国家指标
 *       （SSI / CLABSI / VAP / MDRO）发生率、手卫生依从率、培训合格率与改进建议。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端。
 * 医疗安全红线：预警仅提示，不自动隔离/停药；最终暴发判定与处置由院感科
 * 专职人员签认（acknowledged_by）后生效。
 * 不触碰 WebSocket；不新增依赖。
 *
 * 依据：《医院感染管理办法》（卫生部令第 48 号）、WS/T 312《医院感染监测规范》、
 *       WS/T 313《医务人员手卫生规范》、《医院感染暴发报告及处置管理规范》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 四类院感监测事件（与 clinical.infection_event.event_type 对齐） */
export type InfectionEventType = 'ssi' | 'clabsi' | 'vap' | 'mdro' | 'fever_cluster';

/** 多重耐药菌菌株（MDRO 五类 + ESBL） */
export type MdroStrain = 'MRSA' | 'CRE' | 'CRAB' | 'CRPA' | 'VRE' | 'ESBL' | 'unknown';

/** 同源性判定：same 同种同源 / different 菌株不同 / unknown 未做分子分型 */
export type Homology = 'same' | 'different' | 'unknown';

/* ============================== 0. 体系总览 ============================== */

/** 一个管理维度的国家口径指标 */
export interface InfectionDimensionKpi {
  /** 国家口径目标值（人可读） */
  nationalTarget: string;
  /** 指标监控口径说明（分子÷分母怎么算） */
  monitorNote: string;
}

/** 深度院感管理的一个维度 */
export interface InfectionDimension {
  code: string;
  name: string;
  description: string;
  /** 落地动作清单（真管控，不是看板功能） */
  actions: string[];
  kpi: InfectionDimensionKpi;
}

/** 深度院感管理体系总览 */
export interface DeepInfectionMgmtSystem {
  dimensions: InfectionDimension[];
  /** 依据文号 */
  nationalStandard: string;
  /** 一句话价值主张：真把院感管到哪一步 */
  valueStatement: string;
  /** 安全红线（系统不可逾越的边界） */
  guardrails: string[];
}

/* ============================== 1. 手卫生监测 ============================== */

/** 手卫生五时刻（WS/T 313） */
export type HandMoment =
  | '接触患者前'
  | '清洁/无菌操作前'
  | '暴露患者体液后'
  | '接触患者后'
  | '接触患者周围环境后';

export const HAND_MOMENTS: HandMoment[] = [
  '接触患者前',
  '清洁/无菌操作前',
  '暴露患者体液后',
  '接触患者后',
  '接触患者周围环境后',
];

/** 手卫生监测入参（缺省走内置确定性样例） */
export interface HandHygieneStats {
  /** 观察到的手卫生时机总数（分母） */
  observed: number;
  /** 实际规范执行手卫生次数（分子） */
  compliant: number;
  /** 按时刻分别记录的执行次数（可选，用于列缺口） */
  momentCompliant?: Partial<Record<HandMoment, number>>;
}

/** 手卫生监测结果 */
export interface HandHygieneResult {
  dept: string;
  period: string;
  observed: number;
  compliant: number;
  /** 依从率 %（保留两位小数）= compliant / observed × 100 */
  rate: number;
  /** 国家口径目标 */
  target: string;
  /** 是否达标（≥95%） */
  pass: boolean;
  /** 五时刻名称（固定输出，便于前端渲染雷达/清单） */
  moments: HandMoment[];
  /** 未达标的时刻（若有 momentCompliant） */
  gaps: string[];
}

/* ============================== 2. 暴发识别 ============================== */

/** 一个聚集病例信号 */
export interface OutbreakCase {
  type: InfectionEventType;
  /** 病例发现时间（ISO 字符串，可被 Date 解析） */
  at: string;
  /** 检出菌株（MDRO/SSI 术后培养等，用于同源性判定） */
  strain?: MdroStrain;
}

/** 暴发识别结果 */
export interface OutbreakDetectionResult {
  dept: string;
  /** 聚集判定时间窗（小时）：国家暴发监测常用 72h */
  windowHours: number;
  /** 阈值：窗内病例数达到即预警 */
  threshold: number;
  /** 窗内累计病例数 */
  caseCount: number;
  /** 是否聚集性发病（caseCount >= threshold） */
  cluster: boolean;
  /** 菌株同源性 */
  homology: Homology;
  /** 是否暴发疑似（聚集 且 同种同源） */
  outbreak: boolean;
  /** 涉及事件类型 */
  involvedTypes: InfectionEventType[];
  /** 涉及菌株（去重） */
  involvedStrains: MdroStrain[];
  /** 预警信息（按严重度） */
  alerts: string[];
  /** 暴发控制建议（真动作，不是口号） */
  controlAdvice: string[];
}

/* ============================== 3. 院感报告 ============================== */

/** 四类国家指标发生率 */
export interface InfectionReportRates {
  /** 手术部位感染率 % = SSI 例数 / 手术台次 × 100 */
  ssiRatePercent: number;
  /** 导管相关血流感染率 ‰ = CLABSI 例数 / 中心静脉导管日 × 1000 */
  clabsiPerMille: number;
  /** 呼吸机相关肺炎率 ‰ = VAP 例数 / 机械通气日 × 1000 */
  vapPerMille: number;
  /** 多重耐药菌检出率 ‰ = MDRO 检出例数 / 住院日 × 1000 */
  mdroPerMille: number;
}

/** 周期院感报告 */
export interface InfectionReport {
  period: string;
  counts: { ssi: number; clabsi: number; vap: number; mdro: number };
  denominators: { surgeries: number; centralLineDays: number; ventilatorDays: number; patientDays: number };
  rates: InfectionReportRates;
  /** 手卫生依从率 %（来自 monitorHandHygiene 全院样例） */
  handHygieneRate: number;
  /** 窗内暴发预警条数 */
  outbreakAlerts: number;
  /** 院感培训考核合格率 % */
  trainingPassRate: number;
  /** 结论（一句话总评） */
  conclusion: string;
  /** 改进建议清单 */
  recommendations: string[];
}

/* ============================== 0. 体系总览 ============================== */

/**
 * 深度院感管理体系：四大维度一次盘点。
 * 院感监测要真预警，不能等暴发——每个维度都挂国家口径目标与可落地动作。
 */
export function buildDeepInfectionMgmt(): DeepInfectionMgmtSystem {
  return {
    dimensions: [
      {
        code: 'monitoring',
        name: '院感监测',
        description: '手卫生 / 环境卫生 / 消毒灭菌 / 多重耐药菌（MDRO）日常监测',
        actions: [
          '手卫生依从率每日暗访观察，五时刻逐项打分，目标 ≥95%（WS/T 313）',
          '环境卫生学监测：空气 / 物表 / 医务人员手，每季度采样，菌落数达标方可使用',
          '消毒灭菌效果监测：压力蒸汽生物监测每周一次，植入物每批次生物监测合格放行',
          'MDRO（MRSA/CRE/CRAB/CRPA/VRE/ESBL）检出即接触隔离，登记传播链',
        ],
        kpi: {
          nationalTarget: '手卫生依从率 ≥95%；MDRO 隔离措施落实率 100%',
          monitorNote: '手卫生依从率 = 规范执行次数 / 观察到的时机总数 ×100；MDRO 隔离率 = 已隔离检出例数 / MDRO 检出例数',
        },
      },
      {
        code: 'cases',
        name: '院感病例',
        description: '诊断 / 上报 / 流调 / 处置全流程留痕',
        actions: [
          '临床医生 24h 内填报院感病例诊断，院感专职人员 48h 内完成复核',
          '确诊院感病例通过内网直报系统上报，漏报率纳入科室绩效考核',
          '院感科开展流行病学调查（同源性 / 传播途径 / 危险因素），48h 内出流调记录',
          '处置闭环：隔离 / 环境消毒 / 针对性抗感染 / 解除隔离标准，责任到人',
        ],
        kpi: {
          nationalTarget: '院感病例上报及时率 100%；漏报率 ≤10%',
          monitorNote: '及时上报率 = 24h 内上报例数 / 确诊院感例数；漏报率 = 漏报例数 /（上报+漏报）例数',
        },
      },
      {
        code: 'outbreak',
        name: '暴发预警',
        description: '聚集性发病 + 同源性判定 + 暴发控制（不等暴发才动手）',
        actions: [
          '同科室 72h 窗内 ≥3 例同类事件即自动标红，推送院感科（本模块 detectInfectionOutbreak）',
          '疑似聚集即送微生物室分子分型（PFGE/全基因组），判定同种同源',
          '确认暴发 2h 内启动应急预案：隔离患者 / 停止接收新患者 / 终末消毒',
          '按《医院感染暴发报告及处置管理规范》规定时限上报卫生健康行政部门',
        ],
        kpi: {
          nationalTarget: '暴发识别时间 ≤72h；暴发控制措施 2h 内启动',
          monitorNote: '暴发识别时间 = 首例发病到聚集预警的小时数；控制启动时间 = 预警到隔离/消毒启动的小时数',
        },
      },
      {
        code: 'training',
        name: '培训考核',
        description: '院感知识 + 防护技能 + 考核合格准入',
        actions: [
          '新入职人员院感知识岗前培训 ≥3 学时，考核合格方可独立上岗',
          '手卫生 / 穿脱隔离衣 / 职业暴露处置技能演练每半年一次，OSCE 式实操评分',
          '全院年度院感培训覆盖率 100%，考核合格率 ≥95%',
          '职业暴露（针刺伤等）即时登记与追踪用药，闭环 100%',
        ],
        kpi: {
          nationalTarget: '院感培训覆盖率 100%；考核合格率 ≥95%',
          monitorNote: '培训覆盖率 = 参训人数 / 应训人数；合格率 = 考核合格人数 / 参考人数',
        },
      },
    ],
    nationalStandard:
      '《医院感染管理办法》（卫生部令第48号）· WS/T 312《医院感染监测规范》· ' +
      'WS/T 313《医务人员手卫生规范》·《医院感染暴发报告及处置管理规范》',
    valueStatement:
      '院感管理要真预警：手卫生每日可测、聚集 72h 窗自动标红、同源性一判即启动处置——把院感拦截在暴发之前，而不是暴发之后补登记。',
    guardrails: [
      '预警仅提示，不自动隔离/停药；最终暴发判定与处置由院感科专职人员签认（acknowledged_by）',
      'AI 不自主下达抗菌药或隔离医嘱，只输出证据链与处置建议',
      '院感病例诊断以临床 + 微生物证据为准，不得为降发生率瞒报',
    ],
  };
}

/* ============================== 1. 手卫生监测 ============================== */

/** 内置确定性样例（演示推演可复算）：观察 200 次，规范执行 178 次 → 89% */
const DEMO_HAND_STATS: Required<HandHygieneStats> = {
  observed: 200,
  compliant: 178,
  momentCompliant: {
    接触患者前: 40,
    '清洁/无菌操作前': 42,
    '暴露患者体液后': 38,
    接触患者后: 36,
    接触患者周围环境后: 22,
  },
};

/** 保留两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 手卫生监测：按科室 × 周期统计五时刻依从率。
 * 目标 ≥95%（WS/T 313）；缺省统计时使用内置确定性样例（89%，未达标）。
 */
export function monitorHandHygiene(
  dept: string,
  period: string,
  stats?: HandHygieneStats,
): HandHygieneResult {
  const s: Required<HandHygieneStats> = stats
    ? { observed: Math.max(0, Math.floor(stats.observed)),
        compliant: Math.min(Math.max(0, Math.floor(stats.compliant)), Math.max(0, Math.floor(stats.observed))),
        momentCompliant: stats.momentCompliant ?? {} }
    : DEMO_HAND_STATS;

  const rate = s.observed > 0 ? round2((s.compliant / s.observed) * 100) : 0;
  const perMoment = s.observed / HAND_MOMENTS.length;
  const gaps: string[] = [];
  for (const m of HAND_MOMENTS) {
    const c = s.momentCompliant[m] ?? 0;
    // 该时刻期望覆盖 ≈ 观察总数的 1/5，明显偏低即列为缺口
    if (c > 0 && c < perMoment * 0.7) {
      gaps.push(m);
    }
  }

  return {
    dept,
    period,
    observed: s.observed,
    compliant: s.compliant,
    rate,
    target: '≥95%',
    pass: rate >= 95,
    moments: HAND_MOMENTS,
    gaps,
  };
}

/* ============================== 2. 暴发识别 ============================== */

/**
 * 暴发识别：同科室 72h 窗内病例数达阈值即聚集；叠加同种同源即判暴发疑似。
 *
 * @param dept      科室编码/名称
 * @param cases     病例信号列表（含类型、发现时间、菌株）
 * @param threshold 聚集阈值（例），国家暴发监测常用 ≥3
 */
export function detectInfectionOutbreak(
  dept: string,
  cases: OutbreakCase[],
  threshold = 3,
): OutbreakDetectionResult {
  const windowHours = 72;
  const list = Array.isArray(cases) ? cases : [];

  // 以最晚一例为参考时点，回推 72h 窗
  const times = list.map((c) => new Date(c.at).getTime()).filter((t) => Number.isFinite(t));
  const ref = times.length > 0 ? Math.max(...times) : Date.now();
  const windowStart = ref - windowHours * 3600 * 1000;
  const inWindow = list.filter((c) => {
    const t = new Date(c.at).getTime();
    return Number.isFinite(t) && t >= windowStart && t <= ref;
  });

  const caseCount = inWindow.length;
  const cluster = caseCount >= Math.max(1, threshold);

  // 同源性：有明确菌株的病例，菌株是否一致且非 unknown
  const knownStrains = inWindow
    .map((c) => c.strain)
    .filter((s): s is MdroStrain => !!s && s !== 'unknown');
  let homology: Homology = 'unknown';
  if (knownStrains.length >= 2) {
    homology = knownStrains.every((s) => s === knownStrains[0]) ? 'same' : 'different';
  }
  const outbreak = cluster && homology === 'same';

  const involvedTypes = Array.from(new Set(inWindow.map((c) => c.type)));
  const involvedStrains = Array.from(new Set(knownStrains));

  const alerts: string[] = [];
  if (cluster) {
    alerts.push(`同科室 ${windowHours}h 窗内累计 ${caseCount} 例（阈值 ${threshold}），已达聚集性发病预警线`);
  }
  if (homology === 'same') {
    alerts.push(`检出同种同源菌株 ${knownStrains[0]}，高度提示同源传播链`);
  }
  if (outbreak) {
    alerts.push('暴发疑似成立：立即启动院感暴发应急预案（2h 内）');
  } else if (!cluster) {
    alerts.push(`当前 ${windowHours}h 窗内仅 ${caseCount} 例，未达聚集阈值，按散发监测`);
  }

  const controlAdvice: string[] = outbreak
    ? [
        '隔离全部相关病例，同病区暂停接收新患者',
        '院感科 48h 内完成流行病学调查与环境采样',
        '对密切接触者/环境执行终末消毒（物表/空气/织物）',
        '按《医院感染暴发报告及处置管理规范》时限上报卫生健康行政部门',
      ]
    : cluster
      ? [
          '提升监测级别，加密手卫生与环境采样频次',
          '送微生物室分子分型确认同源性',
          '对可疑感染患者提前实施接触隔离',
        ]
      : [
          '维持常规监测，按周复盘四类院感指标趋势',
        ];

  return {
    dept,
    windowHours,
    threshold,
    caseCount,
    cluster,
    homology,
    outbreak,
    involvedTypes,
    involvedStrains,
    alerts,
    controlAdvice,
  };
}

/* ============================== 3. 院感报告 ============================== */

/**
 * 周期院感报告：内置确定性样例，四类国家发生率可复算。
 * 样例：手术 800 台 SSI 8；中心静脉导管日 600 CLABSI 2；通气日 400 VAP 1；住院日 3000 MDRO 6。
 */
export function generateInfectionReport(period: string): InfectionReport {
  const counts = { ssi: 8, clabsi: 2, vap: 1, mdro: 6 };
  const denominators = { surgeries: 800, centralLineDays: 600, ventilatorDays: 400, patientDays: 3000 };

  const rates: InfectionReportRates = {
    ssiRatePercent: round2((counts.ssi / denominators.surgeries) * 100),
    clabsiPerMille: round2((counts.clabsi / denominators.centralLineDays) * 1000),
    vapPerMille: round2((counts.vap / denominators.ventilatorDays) * 1000),
    mdroPerMille: round2((counts.mdro / denominators.patientDays) * 1000),
  };

  const hand = monitorHandHygiene('全院', period);
  const outbreakAlerts = detectInfectionOutbreak('全院', [
    { type: 'mdro', at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), strain: 'CRE' },
    { type: 'mdro', at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), strain: 'CRE' },
    { type: 'mdro', at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), strain: 'CRE' },
  ], 3).cluster ? 1 : 0;

  const trainingPassRate = 92;

  const recommendations: string[] = [];
  if (hand.rate < 95) recommendations.push(`手卫生依从率 ${hand.rate}% 未达 95%，重点整改「接触患者周围环境后」等薄弱时刻`);
  if (rates.mdroPerMille > 2) recommendations.push(`MDRO 检出率 ${rates.mdroPerMille}‰，强化接触隔离与手卫生`);
  if (outbreakAlerts > 0) recommendations.push('存在聚集预警，院感科须在 72h 内完成流调与同源性确认');
  recommendations.push('按周复盘 SSI/CLABSI/VAP 趋势，专项整改手术与导管操作环节');

  return {
    period,
    counts,
    denominators,
    rates,
    handHygieneRate: hand.rate,
    outbreakAlerts,
    trainingPassRate,
    conclusion:
      `本周期院感总体可控：SSI ${rates.ssiRatePercent}%、CLABSI ${rates.clabsiPerMille}‰、` +
      `VAP ${rates.vapPerMille}‰、MDRO ${rates.mdroPerMille}‰；手卫生依从率 ${hand.rate}%${hand.pass ? '（达标）' : '（未达标）'}。`,
    recommendations,
  };
}
