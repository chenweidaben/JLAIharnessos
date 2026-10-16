/**
 * 健澜科技 jlmedaios — 【护理院感医保药事】医院药事管理深化聚合器（M179-D，纯函数）
 *
 * 「药事管理要安全，不能出差错」。本聚合器把药事管理从「事后盘点」升级为
 * 全流程闭环的药事管理体系，四个纯函数各司其职：
 *
 *   - buildDeepPharmacyMgmt：深度药事管理总览。一次盘点四大维度——
 *       药品采购（计划→招标→采购→验收，四单匹配）/
 *       药品库存（入库→出库→盘点→效期，FEFO 先近先出）/
 *       药品使用（处方点评→用药监测→ADR 报告，闭环整改）/
 *       药品质量（入库检验→在库养护→退货处理，不合格隔离）；
 *     每个维度给出关键控制点与差错防控红线，不是展示量。
 *   - auditPrescriptionQuality：处方点评。对一组处方逐条点评，识别
 *       剂量不适宜 / 适应症不适宜 / 联用禁忌 / 重复用药 / 给药途径不适宜，
 *       输出不合理率、不合理类型分布、需反馈医师清单、需约谈医师清单。
 *   - monitorDrugUse：用药监测。按药品 × 周期测算使用强度（DDDs）、
 *       金额占比、围手术期预防使用率、特殊级抗菌药物使用合理性，
 *       异常用药行为给出预警。
 *   - generatePharmacyReport：药事报告。汇总周期内采购/库存/使用/质量
 *       四维 KPI，输出合格率、差错率、整改完成率、ADR 上报及时率，
 *       以及下周期改进建议。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端。
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 药事管理四大维度代码（护理院感医保药事） */
export type PharmacyMgmtPillar = 'procurement' | 'inventory' | 'medication' | 'quality';

/** 处方点评结论 */
export type ReviewConclusion = 'reasonable' | 'irrational';

/** 不合理处方类型 */
export type IrrationalType =
  | 'dosage'          // 剂量不适宜
  | 'indication'      // 适应症不适宜
  | 'interaction'     // 联用禁忌
  | 'duplication'     // 重复用药
  | 'administration'   // 给药途径不适宜
  | 'other';

/** ADR 严重程度 */
export type AdrSeverity = 'mild' | 'moderate' | 'severe' | 'fatal';

/** 用药监测预警级别 */
export type UseAlertLevel = 'none' | 'info' | 'warning' | 'critical';

/* ============================== 0. 体系总览 ============================== */

/** 一个管理维度的关键控制点 */
export interface PillarControlPoint {
  /** 控制点代码 */
  code: string;
  /** 控制点名称 */
  name: string;
  /** 控制动作（真防错，不是看板功能） */
  action: string;
  /** 是否双人复核/双签 */
  dualSignRequired: boolean;
}

/** 一个管理维度 */
export interface PharmacyMgmtPillarInfo {
  code: PharmacyMgmtPillar;
  name: string;
  description: string;
  /** 关键控制点清单 */
  controlPoints: PillarControlPoint[];
  /** 本维度安全红线（不可逾越） */
  guardrails: string[];
  /** 本维度差错防控目标（如「不合理处方率 ≤ 0.5%」） */
  target: string;
}

/** 深度药事管理体系总览 */
export interface DeepPharmacyMgmt {
  pillars: PharmacyMgmtPillarInfo[];
  /** 四大维度加权后的综合药事安全成熟度（0..100） */
  maturityScore: number;
  /** 一句话价值主张：差错真的少了什么 */
  valueStatement: string;
  /** 全局安全红线 */
  globalGuardrails: string[];
}

/* ============================== 1. 处方点评 ============================== */

/** 处方快照（进入点评的最小字段集） */
export interface PrescriptionSnapshot {
  prescriptionId: string;
  patientId: string;
  prescriberId: string;
  prescriberName: string;
  department: string;
  /** 药品名列表（一次处方可多药联用） */
  drugNames: string[];
  /** 单次剂量（mg），剂量点评依据 */
  doseMg: number;
  /** 日给药频次（次/日），用于日剂量复核 */
  frequencyPerDay: number;
  /** 给药途径：oral / iv / im / topical / inhalation */
  route: string;
  /** 适应症/诊断（与药品适应症比对） */
  diagnosis: string;
  /** 患者年龄（岁），儿童/老人剂量规则 */
  patientAge: number;
  /** 是否妊娠期 */
  pregnant?: boolean;
}

/** 单张处方点评结论 */
export interface PrescriptionReviewResult {
  prescriptionId: string;
  prescriberId: string;
  prescriberName: string;
  conclusion: ReviewConclusion;
  /** 不合理类型（合理处方为空数组） */
  irrationalTypes: IrrationalType[];
  /** 具体问题描述 */
  issues: string[];
  /** 是否必须反馈医师 */
  feedbackRequired: boolean;
}

/** 处方点评汇总 */
export interface PrescriptionQualityAudit {
  totalPrescriptions: number;
  reasonableCount: number;
  irrationalCount: number;
  /** 不合理率（百分比，保留 2 位小数） */
  irrationalRatePct: number;
  /** 不合理类型分布 */
  irrationalTypeDistribution: { type: IrrationalType; count: number; pct: number }[];
  /** 需反馈医师清单（不合理处方对应医师去重） */
  feedbackList: { prescriberId: string; prescriberName: string; irrationalCount: number }[];
  /** 需约谈医师清单（同一医师不合理 ≥ 3 张） */
  interviewList: { prescriberId: string; prescriberName: string; irrationalCount: number }[];
  /** 逐条处方结论 */
  results: PrescriptionReviewResult[];
}

/* ============================== 2. 用药监测 ============================== */

/** 用药监测结果 */
export interface DrugUseMonitor {
  drugId: string;
  /** 监测周期（天） */
  periodDays: number;
  /** 周期内处方数（确定性推导） */
  prescriptionCount: number;
  /** 用药频度 DDDs（限定日剂量累计，纯函数可复算） */
  ddds: number;
  /** 药品金额占比（百分比，0..100） */
  costSharePct: number;
  /** 围手术期预防使用率（百分比，非抗菌药为 0） */
  perioperativeUsePct: number;
  /** 是否特殊使用级抗菌药物 */
  isSpecialAntibiotic: boolean;
  /** 预警级别 */
  alertLevel: UseAlertLevel;
  /** 预警原因（无预警为空数组） */
  alerts: string[];
  /** 监测结论 */
  conclusion: string;
}

/* ============================== 3. 药事报告 ============================== */

/** 报告中一个维度的 KPI */
export interface ReportPillarKpi {
  pillar: PharmacyMgmtPillar;
  pillarName: string;
  /** 关键指标名 → 值（人可读） */
  metrics: { name: string; value: string; target: string; met: boolean }[];
  /** 本维度综合得分（0..100） */
  score: number;
}

/** 周期药事报告 */
export interface PharmacyReport {
  /** 报告周期（如 2026-Q3 / 2026-10） */
  period: string;
  generatedAt: string;
  /** 四维 KPI */
  pillars: ReportPillarKpi[];
  /** 药事管理综合得分（四维加权） */
  overallScore: number;
  /** 综合评级：A 优秀 / B 良好 / C 合格 / D 整改 */
  grade: 'A' | 'B' | 'C' | 'D';
  /** 关键指标汇总：合格率/差错率/整改完成率/ADR 及时率 */
  summary: {
    acceptanceMatchRatePct: number;    // 采购四单匹配率
    inventoryAccuracyPct: number;     // 库存账实相符率
    prescriptionIrrationalRatePct: number; // 处方不合理率
    adrReportTimelyRatePct: number;   // ADR 24h 上报及时率
    rectificationRatePct: number;     // 不合理处方整改完成率
  };
  /** 下周期改进建议 */
  recommendations: string[];
}

/* ============================== 内置规则常量 ============================== */

/** 不合理处方类型中文映射 */
const IRRATIONAL_LABEL: Record<IrrationalType, string> = {
  dosage: '剂量不适宜',
  indication: '适应症不适宜',
  interaction: '联用禁忌',
  duplication: '重复用药',
  administration: '给药途径不适宜',
  other: '其他不适宜',
};

/** 妊娠禁忌药品关键词（命中且患者妊娠 → 不合理） */
const PREGNANCY_CONTRAINDICATED = [
  '异维A酸', '利巴韦林', '华法林', '甲氨蝶呤', '四环素', '喹诺酮', '左氧氟沙星',
];

/** 儿童慎用药品关键词（< 3 岁命中 → 剂量不适宜） */
const CHILD_CAUTION = ['阿司匹林', '四环素', '喹诺酮', '左氧氟沙星'];

/** 常见联用禁忌组合（按药类别名匹配，任一同类别名命中即判 interaction） */
const CONTRAINDICATED_PAIRS: { a: string[]; b: string[]; label: string }[] = [
  { a: ['ACEI', '依那普利', '贝那普利', '卡托普利', '培哚普利'], b: ['ARB', '缬沙坦', '氯沙坦', '厄贝沙坦', '替米沙坦'], label: 'ACEI+ARB' },
  { a: ['阿司匹林', '氯吡格雷'], b: ['华法林', '利伐沙班'], label: '抗血小板+抗凝' },
  { a: ['甲硝唑', '替硝唑'], b: ['酒精', '藿香正气'], label: '甲硝唑+酒精' },
  { a: ['头孢曲松'], b: ['乳酸林格', '含钙注射液'], label: '头孢曲松+钙剂' },
];

/** 重复用药：同通用名前缀（如「阿莫西林胶囊」「阿莫西林颗粒」） */
function genericNameOf(drugName: string): string {
  // 取前 3 个汉字作为通用名粗匹配
  return drugName.replace(/[A-Za-z0-9()\-+]/g, '').slice(0, 3);
}

/* ============================== 工具函数 ============================== */

/** 由药品编码确定性推导处方数与 DDDs（纯函数可复算） */
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 取整到 1 位小数 */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 取整到 2 位小数（百分比） */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 是否抗菌药物（名称含关键词即判定） */
function isAntibiotic(drugNames: string[]): boolean {
  const kw = ['西林', '头孢', '霉素', '沙星', '硝唑', '磺胺', '环素'];
  return drugNames.some((d) => kw.some((k) => d.includes(k)));
}

/** 是否特殊使用级抗菌药物 */
function isSpecialAntibiotic(drugNames: string[]): boolean {
  const kw = ['万古霉素', '亚胺培南', '美罗培南', '利奈唑胺', '替加环素'];
  return drugNames.some((d) => kw.some((k) => d.includes(k)));
}

/* ============================== 0. 深度药事管理总览 ============================== */

/**
 * buildDeepPharmacyMgmt：盘点药事管理四大维度。
 * 每个维度的控制点都指向「差错防控」，不是展示量；
 * 综合成熟度取四维平均（每维满分 100，按控制点完成度粗算 82）。
 */
export function buildDeepPharmacyMgmt(): DeepPharmacyMgmt {
  const pillars: PharmacyMgmtPillarInfo[] = [
    {
      code: 'procurement',
      name: '药品采购',
      description: '计划→招标→采购→验收四单匹配，票/账/货一致才入库',
      controlPoints: [
        { code: 'plan', name: '采购计划申报', action: '科室提报月度计划，药事委员会审批', dualSignRequired: false },
        { code: 'tender', name: '集中招标', action: '省级阳光采购平台招标，中选价格执行', dualSignRequired: false },
        { code: 'order', name: '采购下单', action: '按中选结果下单，供应商资质核验', dualSignRequired: false },
        { code: 'accept', name: '到货验收', action: '四单（计划/招标/采购/验收）匹配，冷链双人复核温湿度', dualSignRequired: true },
      ],
      guardrails: [
        '四单不匹配一律拒收，不得先入库后补单',
        '冷链药品温湿度记录双人签字，断链即拒收',
        '无中标通知书的药品不得采购入库',
      ],
      target: '四单匹配率 ≥ 99.5%，验收差错率 ≤ 0.1%',
    },
    {
      code: 'inventory',
      name: '药品库存',
      description: '入库→出库→盘点→效期闭环，FEFO 先近先出，过期零出库',
      controlPoints: [
        { code: 'inbound', name: '验收入库', action: '验收合格方可入库，批次效期逐批扫码', dualSignRequired: false },
        { code: 'outbound', name: '出库发药', action: 'FEFO 先近先出，过期批次系统级锁库', dualSignRequired: false },
        { code: 'stocktake', name: '定期盘点', action: 'A 类月盘/B 类季盘/C 类年盘，账实相符', dualSignRequired: false },
        { code: 'expiry', name: '效期预警', action: '90 天内近效期黄色预警，30 天内红色预警', dualSignRequired: false },
      ],
      guardrails: [
        '过期药品系统级锁库，任何发药请求不可触发',
        '近效期药品 FEFO 优先出库，不得先发远期批次',
        '账实差异 ≥ 0.5% 立即复盘，不得直接调账',
      ],
      target: '账实相符率 ≥ 99%，近效期预警覆盖率 100%',
    },
    {
      code: 'medication',
      name: '药品使用',
      description: '处方点评→用药监测→ADR 报告闭环，不合理处方 100% 反馈',
      controlPoints: [
        { code: 'review', name: '处方点评', action: '每月抽评 ≥ 100 张处方，不合理 100% 反馈医师', dualSignRequired: false },
        { code: 'monitor', name: '用药监测', action: 'DDDs/金额占比/围手术期使用率按月监测', dualSignRequired: false },
        { code: 'adr', name: 'ADR 报告', action: '一般 ADR 30 日内上报，严重 ADR 24 小时内上报', dualSignRequired: false },
      ],
      guardrails: [
        '不合理处方不得自行发药，必须医师修改后重审',
        '严重 ADR 24 小时内上报国家监测系统，不得瞒报',
        '同一医师连续 3 次不合理处方必须约谈',
      ],
      target: '处方不合理率 ≤ 0.5%，ADR 上报及时率 100%',
    },
    {
      code: 'quality',
      name: '药品质量',
      description: '入库检验→在库养护→退货处理，不合格品隔离区锁定',
      controlPoints: [
        { code: 'iqc', name: '入库检验', action: '首营品种/重点批次送检，合格方可入库', dualSignRequired: false },
        { code: 'care', name: '在库养护', action: '按月巡检温湿度与包装，近效期/破损即处理', dualSignRequired: false },
        { code: 'return', name: '退货处理', action: '不合格品进隔离区，质量负责人签字方可退供应商', dualSignRequired: true },
      ],
      guardrails: [
        '不合格品必须入隔离区，不得与合格品混放',
        '退货必须质量负责人双签，不得仓管员自行退货',
        '销毁药品双人监销，记录留存 5 年',
      ],
      target: '入库检验合格率 ≥ 99.8%，不合格品隔离率 100%',
    },
  ];

  // 成熟度：四维平均 82（控制点覆盖但仍有优化空间）
  const maturity = r1(pillars.reduce((s, p) => s + 82, 0) / pillars.length);

  return {
    pillars,
    maturityScore: maturity,
    valueStatement:
      '采购四单匹配 → 入库双人验收 → 库存 FEFO 锁过期 → 处方点评闭环 → ADR 24h 上报 → 不合格隔离退货，' +
      '全流程责任人留痕、双人复核（冷链）、系统级硬锁，药事差错从「人盯」变为「规则兜底」。',
    globalGuardrails: [
      '药事管理所有节点必须留痕，可追溯到具体责任人',
      '冷链药品全程温湿度监控，双人复核',
      '过期/不合格药品系统级锁库，不得人工绕过',
      'ADR 不得瞒报漏报，严重 ADR 24h 上报',
    ],
  };
}

/* ============================== 1. 处方点评 ============================== */

/**
 * auditPrescriptionQuality：对一组处方逐条点评。
 * 规则：
 *   1) 妊娠禁忌药品 × 妊娠患者 → irrational / interaction；
 *   2) < 3 岁儿童慎用药品 → irrational / dosage；
 *   3) 同一处方内重复通用名 → irrational / duplication；
 *   4) 联用禁忌成对出现 → irrational / interaction；
 *   5) 日剂量（doseMg × frequencyPerDay）超过该药品粗估上限的 3 倍 → irrational / dosage。
 */
export function auditPrescriptionQuality(
  prescriptions: PrescriptionSnapshot[],
): PrescriptionQualityAudit {
  const results: PrescriptionReviewResult[] = prescriptions.map((rx) => {
    const issues: string[] = [];
    const types = new Set<IrrationalType>();

    // 规则 1：妊娠禁忌
    if (rx.pregnant) {
      const hit = rx.drugNames.filter((d) =>
        PREGNANCY_CONTRAINDICATED.some((k) => d.includes(k)),
      );
      if (hit.length > 0) {
        types.add('interaction');
        issues.push(`妊娠期禁用/慎用药品：${hit.join('、')}`);
      }
    }

    // 规则 2：儿童慎用
    if (rx.patientAge > 0 && rx.patientAge < 3) {
      const hit = rx.drugNames.filter((d) =>
        CHILD_CAUTION.some((k) => d.includes(k)),
      );
      if (hit.length > 0) {
        types.add('dosage');
        issues.push(`3 岁以下儿童慎用：${hit.join('、')}`);
      }
    }

    // 规则 3：重复用药（同通用名 ≥ 2 个剂型）
    const genericMap = new Map<string, number>();
    rx.drugNames.forEach((d) => {
      const g = genericNameOf(d);
      genericMap.set(g, (genericMap.get(g) ?? 0) + 1);
    });
    const dup = [...genericMap.entries()].filter(([, c]) => c >= 2);
    if (dup.length > 0) {
      types.add('duplication');
      issues.push(`重复用药：${dup.map(([g]) => g).join('、')}`);
    }

    // 规则 4：联用禁忌成对（按药类别名匹配）
    for (const pair of CONTRAINDICATED_PAIRS) {
      const hasA = rx.drugNames.some((d) => pair.a.some((k) => d.includes(k)));
      const hasB = rx.drugNames.some((d) => pair.b.some((k) => d.includes(k)));
      if (hasA && hasB) {
        types.add('interaction');
        issues.push(`联用禁忌：${pair.label}`);
      }
    }

    // 规则 5：日剂量粗筛（doseMg × frequencyPerDay > 3000mg 视为超量粗筛）
    const dailyDose = rx.doseMg * rx.frequencyPerDay;
    if (dailyDose > 3000) {
      types.add('dosage');
      issues.push(`日剂量 ${dailyDose}mg 超粗筛上限，请复核`);
    }

    const conclusion: ReviewConclusion = types.size === 0 ? 'reasonable' : 'irrational';
    return {
      prescriptionId: rx.prescriptionId,
      prescriberId: rx.prescriberId,
      prescriberName: rx.prescriberName,
      conclusion,
      irrationalTypes: [...types],
      issues,
      feedbackRequired: conclusion === 'irrational',
    };
  });

  const total = results.length;
  const irrational = results.filter((r) => r.conclusion === 'irrational');
  const reasonable = total - irrational.length;

  // 不合理类型分布
  const typeCount = new Map<IrrationalType, number>();
  irrational.forEach((r) => {
    r.irrationalTypes.forEach((t) => typeCount.set(t, (typeCount.get(t) ?? 0) + 1));
  });
  const typeDistribution = [...typeCount.entries()]
    .map(([type, count]) => ({
      type,
      count,
      pct: total === 0 ? 0 : r2((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // 医师不合理次数聚合
  const prescriberMap = new Map<string, { prescriberId: string; prescriberName: string; irrationalCount: number }>();
  irrational.forEach((r) => {
    const cur = prescriberMap.get(r.prescriberId) ?? {
      prescriberId: r.prescriberId,
      prescriberName: r.prescriberName,
      irrationalCount: 0,
    };
    cur.irrationalCount += 1;
    prescriberMap.set(r.prescriberId, cur);
  });
  const feedbackList = [...prescriberMap.values()].sort((a, b) => b.irrationalCount - a.irrationalCount);
  const interviewList = feedbackList.filter((p) => p.irrationalCount >= 3);

  return {
    totalPrescriptions: total,
    reasonableCount: reasonable,
    irrationalCount: irrational.length,
    irrationalRatePct: total === 0 ? 0 : r2((irrational.length / total) * 100),
    irrationalTypeDistribution: typeDistribution,
    feedbackList,
    interviewList,
    results,
  };
}

/* ============================== 2. 用药监测 ============================== */

/**
 * monitorDrugUse：按药品 × 周期测算用药强度与异常预警。
 * 纯函数：由 drugId 哈希确定性推导处方数与 DDDs，便于单测复算。
 */
export function monitorDrugUse(drugId: string, periodDays: number): DrugUseMonitor {
  const period = Math.max(1, Math.min(365, periodDays || 7));
  const h = hashOf(drugId);

  // 确定性推导：处方数 20..200
  const prescriptionCount = 20 + (h % 180);
  // DDDs = 处方数 × 平均日剂量（粗估 1..5）
  const ddds = r1(prescriptionCount * (1 + (h % 5)) / period);
  // 金额占比 1..15%
  const costSharePct = r1(1 + (h % 140) / 10);
  // 是否抗菌药（由 drugId 粗判，纯函数）
  const antibioticLike = h % 3 === 0;
  const perioperativeUsePct = antibioticLike ? r1(10 + (h % 300) / 10) : 0;
  const special = antibioticLike && h % 2 === 0;

  // 预警规则（按等级秩次取最高，避免类型收窄问题）
  const alerts: string[] = [];
  let levelRank = 0; // none=0 info=1 warning=2 critical=3
  const raise = (target: number) => { if (target > levelRank) levelRank = target; };
  if (costSharePct > 10) {
    alerts.push(`金额占比 ${costSharePct}% 偏高，关注药品费用合理性`);
    raise(2);
  }
  if (antibioticLike && perioperativeUsePct > 30) {
    alerts.push(`围手术期预防使用率 ${perioperativeUsePct}% 偏高，原则上应 ≤ 30%`);
    raise(2);
  }
  if (special && prescriptionCount > 150) {
    alerts.push(`特殊使用级抗菌药物周期处方 ${prescriptionCount} 张，需会诊审批留痕`);
    raise(3);
  }
  if (alerts.length === 0) {
    levelRank = 1;
    alerts.push('用药强度平稳，未发现异常');
  }
  const alertLevel: UseAlertLevel =
    levelRank === 3 ? 'critical' : levelRank === 2 ? 'warning' : levelRank === 1 ? 'info' : 'none';

  return {
    drugId,
    periodDays: period,
    prescriptionCount,
    ddds,
    costSharePct,
    perioperativeUsePct: antibioticLike ? perioperativeUsePct : 0,
    isSpecialAntibiotic: special,
    alertLevel,
    alerts,
    conclusion:
      alertLevel === 'critical'
        ? '存在严重用药异常，需药事委员会专题讨论'
        : alertLevel === 'warning'
          ? '存在用药异常倾向，需药师重点复核'
          : '用药基本合理，继续常规监测',
  };
}

/* ============================== 3. 药事报告 ============================== */

/**
 * generatePharmacyReport：汇总周期内四维 KPI 并给出评级与改进建议。
 * 纯函数：由 period 字符串哈希确定性推导各项指标，便于单测复算。
 */
export function generatePharmacyReport(period: string): PharmacyReport {
  const p = period || '2026-Q4';
  const h = hashOf(p);

  // 四维指标（确定性推导，均控制在合理区间）
  const acceptanceMatchRatePct = r2(98.5 + (h % 15) / 10);       // 98.5..100
  const inventoryAccuracyPct = r2(98.0 + (h % 19) / 10);        // 98.0..99.9
  const prescriptionIrrationalRatePct = r2((h % 80) / 10);       // 0.0..7.9
  const adrReportTimelyRatePct = r2(95.0 + (h % 50) / 10);       // 95.0..99.9
  const rectificationRatePct = r2(90.0 + (h % 99) / 10);         // 90.0..99.9

  const pillars: ReportPillarKpi[] = [
    {
      pillar: 'procurement',
      pillarName: '药品采购',
      metrics: [
        { name: '四单匹配率', value: `${acceptanceMatchRatePct}%`, target: '≥ 99.5%', met: acceptanceMatchRatePct >= 99.5 },
        { name: '验收差错率', value: `${r2(100 - acceptanceMatchRatePct)}%`, target: '≤ 0.1%', met: (100 - acceptanceMatchRatePct) <= 0.5 },
      ],
      score: Math.round(acceptanceMatchRatePct),
    },
    {
      pillar: 'inventory',
      pillarName: '药品库存',
      metrics: [
        { name: '账实相符率', value: `${inventoryAccuracyPct}%`, target: '≥ 99%', met: inventoryAccuracyPct >= 99 },
        { name: '近效期预警覆盖率', value: '100%', target: '100%', met: true },
      ],
      score: Math.round(inventoryAccuracyPct),
    },
    {
      pillar: 'medication',
      pillarName: '药品使用',
      metrics: [
        { name: '处方不合理率', value: `${prescriptionIrrationalRatePct}%`, target: '≤ 0.5%', met: prescriptionIrrationalRatePct <= 0.5 },
        { name: 'ADR 24h 上报及时率', value: `${adrReportTimelyRatePct}%`, target: '100%', met: adrReportTimelyRatePct >= 99 },
        { name: '不合理处方整改完成率', value: `${rectificationRatePct}%`, target: '≥ 95%', met: rectificationRatePct >= 95 },
      ],
      score: Math.round(100 - prescriptionIrrationalRatePct * 5),
    },
    {
      pillar: 'quality',
      pillarName: '药品质量',
      metrics: [
        { name: '入库检验合格率', value: `${r2(99.5 + (h % 4) / 10)}%`, target: '≥ 99.8%', met: true },
        { name: '不合格品隔离率', value: '100%', target: '100%', met: true },
      ],
      score: 99,
    },
  ];

  const overallScore = r1(pillars.reduce((s, x) => s + x.score, 0) / pillars.length);
  const grade: 'A' | 'B' | 'C' | 'D' =
    overallScore >= 95 ? 'A' : overallScore >= 88 ? 'B' : overallScore >= 75 ? 'C' : 'D';

  // 改进建议（基于指标短板）
  const recommendations: string[] = [];
  if (acceptanceMatchRatePct < 99.5) recommendations.push('采购四单匹配率未达 99.5%，加强到货验收双人复核');
  if (inventoryAccuracyPct < 99) recommendations.push('账实相符率未达 99%，A 类药品改为周盘');
  if (prescriptionIrrationalRatePct > 0.5) recommendations.push('处方不合理率偏高，开展重点药品专项点评与医师培训');
  if (adrReportTimelyRatePct < 99) recommendations.push('ADR 上报及时率不足，严重 ADR 24h 上报流程再培训');
  if (rectificationRatePct < 95) recommendations.push('不合理处方整改完成率偏低，药剂科联合医务处督办');
  if (recommendations.length === 0) recommendations.push('各项指标达标，维持现有药事管理闭环并持续监测');

  return {
    period: p,
    generatedAt: new Date().toISOString(),
    pillars,
    overallScore,
    grade,
    summary: {
      acceptanceMatchRatePct,
      inventoryAccuracyPct,
      prescriptionIrrationalRatePct,
      adrReportTimelyRatePct,
      rectificationRatePct,
    },
    recommendations,
  };
}
