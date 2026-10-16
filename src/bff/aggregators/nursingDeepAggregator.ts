/**
 * 健澜科技 jlmedaios - M179-A 医院护理管理深化——真关心护士，不是监控
 *
 * 【护理院感医保药事】护理管理要真关心护士，不是监控：
 *
 *   - calculateNursingRatio(ward, patients, nurses)
 *       纯函数：床护比计算。每护士分管患者数 vs 公开标准；不达标时建议「增补人力」，
 *       而不是让现有护士延长当班。
 *   - identifyNursingRisk(ward, patients)
 *       纯函数：护理风险识别（压疮 Braden / 跌倒坠床 / 管路滑脱 / 意识障碍 / 危重）。
 *       输出的是「关怀动作」（翻身、护栏、交接、宣教），不是监控式打分。
 *   - generateNursingQualityReport(period)
 *       纯函数：护理质量报告（基础护理合格率 / 危重护理合格率 / 不良事件分级 +
 *       三基三严/专科技能/应急演练 + 论文/专利/品管圈）。质量出问题先查流程，不先扣钱。
 *   - buildDeepNursingMgmt()
 *       纯函数：深度护理管理驾驶舱（排班 + 质量 + 培训 + 科研四维总览）。
 *
 * 关怀设计红线：
 *   1) 床护比按病区类型给公开标准（普通 ≤8 人/护士·班、ICU ≤2.5、儿科 ≤6），
 *      缺人时给「建议增补护士数」，并提示「不建议靠加班补位」；
 *   2) 加班累计超 36h/月 即橙色预警，建议调休——记录加班是为了保护护士，不是监控出勤；
 *   3) 不良事件分级上报 + 根因分析(RCA)，care_action 写流程改进，不写处罚；
 *   4) 所有函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用。
 *
 * 内置演示台账与 deploy/postgres/init/364-nursing-deep.sql 种子对齐，空库即可演示。
 *
 * 【远期】接入真实护理管理系统(NIS)后由数据回写替换内置台账；本切片不做 WebSocket 推送。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 病区类型（决定床护比公开标准） */
export type WardType = 'general' | 'icu' | 'pediatrics' | 'emergency';

/** 班次 */
export type ShiftSlot = 'day' | 'swing' | 'night';

/** 床护比结果 */
export interface NursingRatioResult {
  ward: string;
  wardType: WardType;
  /** 在院患者数 */
  patients: number;
  /** 当班护士数 */
  nurses: number;
  /** 每护士分管患者数 = patients / nurses（保留 2 位） */
  patientsPerNurse: number;
  /** 该病区类型公开的每护士分管上限（人/班） */
  standardMaxPerNurse: number;
  /** 按标准应配护士数 = ceil(patients / standardMax) */
  requiredNurses: number;
  /** 人力缺口 = requiredNurses - nurses（负=充足） */
  nurseShortage: number;
  /** 床护比状态：understaffed 偏紧 / balanced 达标 / abundant 充足 */
  status: 'understaffed' | 'balanced' | 'abundant';
  /** 关怀建议（缺人补位，不逼加班） */
  careSuggestion: string;
}

/** 风险患者入参（脱敏，不含姓名） */
export interface RiskPatient {
  id: string;
  age: number;
  /** Braden 压疮评分 6~23，越低越危险 */
  bradenScore: number;
  fallRisk: 'low' | 'medium' | 'high';
  /** 是否意识障碍 */
  impairedConsciousness: boolean;
  /** 是否带管路（引流管/尿管/静脉置管） */
  hasTube: boolean;
  /** 是否危重（特级/一级护理） */
  critical: boolean;
}

/** 单个患者的护理风险 */
export interface PatientNursingRisk {
  patientId: string;
  level: 'high' | 'medium' | 'low';
  /** 命中的风险因素（人读） */
  factors: string[];
  /** 关怀动作（不是监控） */
  careActions: string[];
}

/** 病区风险识别报告 */
export interface NursingRiskReport {
  ward: string;
  totalPatients: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** 高风险患者建议在排班时优先安排有经验护士 */
  staffingNote: string;
  patients: PatientNursingRisk[];
}

/** 护理不良事件条目 */
export interface AdverseEvent {
  eventId: string;
  ward: string;
  level: 'sentinel' | 'ii' | 'iii' | 'iv';
  category: string;
  rcaDone: boolean;
  /** 流程改进/关怀动作（不写处罚） */
  careAction: string;
}

/** 护理质量报告 */
export interface NursingQualityReport {
  period: string;
  /** 基础护理合格率 0..1 */
  basicCarePassRate: number;
  /** 危重护理合格率 0..1 */
  criticalCarePassRate: number;
  /** 不良事件（本期） */
  adverseEvents: AdverseEvent[];
  /** 不良事件总数 */
  adverseEventCount: number;
  /** 已完成根因分析比例 0..1 */
  rcaDoneRate: number;
  /** 护理培训 */
  training: {
    /** 三基三严考核合格率 0..1 */
    sanjiSanyanPassRate: number;
    /** 专科技能考核合格率 0..1 */
    specialtyPassRate: number;
    /** 应急演练场次 */
    emergencyDrills: number;
  };
  /** 护理科研 */
  research: {
    papers: number;
    patents: number;
    qualityControlCircles: number;
  };
  /** 关怀总结（质量出问题先查流程，不先扣钱） */
  summary: string;
}

/** 一个病区的排班人力台账 */
export interface WardLedger {
  ward: string;
  wardName: string;
  wardType: WardType;
  patients: number;
  nursesOnDuty: number;
  /** 本月累计加班小时 */
  overtimeHours: number;
}

/* ------------------------------- 公开标准常量（写死，不黑箱） ------------------------------- */

/**
 * 各病区类型每护士单班分管患者上限（公开标准）：
 *   普通病房 ≤8；ICU ≤2.5；儿科 ≤6；急诊 ≤6（高周转）。
 * 依据：《优质护理服务评价标准》及综合医院分级护理指导原则的常用内控值。
 */
export const NURSING_RATIO_STANDARD: Record<WardType, number> = Object.freeze({
  general: 8,
  icu: 2.5,
  pediatrics: 6,
  emergency: 6,
});

/** 加班关怀阈值：单月累计加班超过该值即预警（劳动法月加班上限 36h） */
export const OVERTIME_CARE_LIMIT_HOURS = 36;

/* ------------------------------- 内置演示台账（与 364-nursing-deep.sql 对齐） ------------------------------- */

const WARD_LEDGER: WardLedger[] = [
  { ward: 'GEN-01', wardName: '心内科普通病房', wardType: 'general', patients: 42, nursesOnDuty: 6, overtimeHours: 28.0 },
  { ward: 'GEN-02', wardName: '普外科普通病房', wardType: 'general', patients: 38, nursesOnDuty: 5, overtimeHours: 41.0 },
  { ward: 'ICU-01', wardName: '中心监护室',     wardType: 'icu',        patients: 12, nursesOnDuty: 8, overtimeHours: 18.0 },
  { ward: 'PED-01', wardName: '儿科病房',       wardType: 'pediatrics', patients: 24, nursesOnDuty: 4, overtimeHours: 9.0 },
];

/** 不良事件台账 */
const ADVERSE_EVENT_LEDGER: AdverseEvent[] = [
  { eventId: 'AE-2026-001', ward: 'GEN-01', level: 'iii', category: '跌倒坠床', rcaDone: true, careAction: '增设床边护栏 + 家属陪护宣教 + 交接班挂牌' },
  { eventId: 'AE-2026-002', ward: 'GEN-02', level: 'iv',  category: '压力性损伤', rcaDone: true, careAction: 'Braden 高危每 2h 翻身 + 申请减压垫' },
  { eventId: 'AE-2026-003', ward: 'ICU-01', level: 'ii',   category: '管路滑脱', rcaDone: true, careAction: '管路双重固定 + 镇静评分复评' },
];

/** 培训台账（各周期各类：参训 / 合格 / 是否演练） */
const TRAINING_LEDGER: Record<string, { trainees: number; passed: number; drill: boolean }[]> = {
  '2026Q3': [
    { trainees: 40, passed: 38, drill: false }, // 三基三严 CPR
    { trainees: 24, passed: 22, drill: false }, // 专科技能 静疗
    { trainees: 30, passed: 30, drill: true },  // 应急演练 火灾/停电
  ],
};

/** 科研台账（按周期） */
const RESEARCH_LEDGER: Record<string, { papers: number; patents: number; qcc: number }> = {
  '2026Q3': { papers: 1, patents: 1, qcc: 1 },
};

/* ------------------------------- 纯函数一：床护比计算 ------------------------------- */

/**
 * calculateNursingRatio(ward, patients, nurses)
 * 床护比计算：每护士分管患者数 vs 公开标准，给出应配护士数与人力缺口。
 *
 * @param ward    病区编码（如 GEN-01 / ICU-01）；同时用于推断病区类型，
 *                含 'ICU' → icu，含 'PED' → pediatrics，否则 general。
 * @param patients 在院患者数（占用床位数）
 * @param nurses   当班护士数
 *
 * 关怀：偏紧/缺人时建议增补人力，并明确「不建议靠加班补位」。
 */
export function calculateNursingRatio(
  ward: string,
  patients: number,
  nurses: number,
): NursingRatioResult {
  const wardType = resolveWardType(ward);
  const standardMax = NURSING_RATIO_STANDARD[wardType];

  const safePatients = Math.max(0, patients);
  const safeNurses = Math.max(0, nurses);

  const patientsPerNurse =
    safeNurses > 0 ? Math.round((safePatients / safeNurses) * 100) / 100 : safePatients;

  // 按公开标准应配护士数：ceil(患者 / 单班上限)
  const requiredNurses =
    safePatients > 0 ? Math.ceil(safePatients / standardMax) : 0;
  const nurseShortage = requiredNurses - safeNurses;

  let status: NursingRatioResult['status'];
  if (safeNurses === 0 && safePatients > 0) {
    status = 'understaffed';
  } else if (patientsPerNurse <= standardMax) {
    status = nurseShortage <= 0 ? 'abundant' : 'balanced';
  } else if (patientsPerNurse <= standardMax * 1.2) {
    status = 'balanced'; // 略紧但可接受
  } else {
    status = 'understaffed';
  }

  let careSuggestion: string;
  if (status === 'understaffed') {
    careSuggestion =
      `当前每护士分管 ${patientsPerNurse} 人，超过标准 ${standardMax} 人/班；` +
      `建议增补 ${nurseShortage} 名护士，不建议靠现有护士加班补位（保护护士）。`;
  } else if (status === 'balanced') {
    careSuggestion = '人力基本达标，关注夜班与连排，注意护士疲劳度。';
  } else {
    careSuggestion = '人力充足，可安排护士轮休与培训。';
  }

  return {
    ward,
    wardType,
    patients: safePatients,
    nurses: safeNurses,
    patientsPerNurse,
    standardMaxPerNurse: standardMax,
    requiredNurses,
    nurseShortage,
    status,
    careSuggestion,
  };
}

/** 由病区编码推断病区类型（演示约定） */
function resolveWardType(ward: string): WardType {
  const w = (ward || '').toUpperCase();
  if (w.includes('ICU')) return 'icu';
  if (w.includes('PED') || w.includes('PEDI')) return 'pediatrics';
  if (w.includes('ER') || w.includes('EMER')) return 'emergency';
  return 'general';
}

/* ------------------------------- 纯函数二：护理风险识别 ------------------------------- */

/**
 * identifyNursingRisk(ward, patients)
 * 护理风险识别：对每位患者评估压疮(Braden)/跌倒/管路/意识/危重，
 * 输出风险等级与「关怀动作」（不是监控）。
 *
 * 规则（公开）：
 *   - Braden ≤12 → 压疮高危；≤16 → 中危；
 *   - fallRisk high → 跌倒高危；medium → 中危；
 *   - 意识障碍 → 坠床高危（约束/陪护）；
 *   - 带管路 → 管路滑脱风险；
 *   - 危重 → 特级/一级护理倾斜人力。
 *   high = 任一高危命中；medium = 任一中危；否则 low。
 */
export function identifyNursingRisk(ward: string, patients: RiskPatient[]): NursingRiskReport {
  const results: PatientNursingRisk[] = patients.map((p) => {
    const factors: string[] = [];
    const careActions: string[] = [];
    let level: PatientNursingRisk['level'] = 'low';

    // 压疮
    if (p.bradenScore <= 12) {
      factors.push(`Braden ${p.bradenScore}（压疮高危）`);
      careActions.push('每 2 小时翻身一次 + 使用减压垫');
      level = 'high';
    } else if (p.bradenScore <= 16) {
      factors.push(`Braden ${p.bradenScore}（压疮中危）`);
      careActions.push('每 4 小时翻身 + 皮肤评估');
      if (level === 'low') level = 'medium';
    }

    // 跌倒
    if (p.fallRisk === 'high') {
      factors.push('跌倒/坠床高危');
      careActions.push('床栏拉起 + 呼叫器在手边 + 家属陪护宣教');
      level = 'high';
    } else if (p.fallRisk === 'medium') {
      factors.push('跌倒中危');
      careActions.push('地面防滑 + 起床陪护提醒');
      if (level === 'low') level = 'medium';
    }

    // 意识障碍
    if (p.impairedConsciousness) {
      factors.push('意识障碍');
      careActions.push('加强巡视 + 必要时保护性约束（知情告知）');
      level = 'high';
    }

    // 管路
    if (p.hasTube) {
      factors.push('带管路（防滑脱）');
      careActions.push('管路双重固定 + 每班评估通畅');
      if (level === 'low') level = 'medium';
    }

    // 危重
    if (p.critical) {
      factors.push('危重（特级/一级护理）');
      careActions.push('安排高年资护士分管 + 床边交接');
      level = 'high';
    }

    if (factors.length === 0) {
      careActions.push('常规护理 + 健康教育');
    }

    return { patientId: p.id, level, factors, careActions };
  });

  const highCount = results.filter((r) => r.level === 'high').length;
  const mediumCount = results.filter((r) => r.level === 'medium').length;
  const lowCount = results.filter((r) => r.level === 'low').length;

  return {
    ward,
    totalPatients: patients.length,
    highCount,
    mediumCount,
    lowCount,
    staffingNote:
      highCount > 0
        ? `${highCount} 名高风险患者，建议排班时优先安排高年资护士分管、床边重点交接（不是监控护士，是支持护士）。`
        : '本期无高风险患者，常规巡视即可。',
    patients: results,
  };
}

/* ------------------------------- 纯函数三：护理质量报告 ------------------------------- */

/**
 * generateNursingQualityReport(period)
 * 护理质量报告：基础/危重护理合格率 + 不良事件分级 + 培训 + 科研，
 * 质量出问题先查流程与人力，不先扣护士钱。
 */
export function generateNursingQualityReport(period: string = '2026Q3'): NursingQualityReport {
  const trainings = TRAINING_LEDGER[period] ?? [];
  const sanji = trainings.filter((t, i) => i === 0)[0]; // 第一条=三基三严
  const specialty = trainings.filter((t, i) => i === 1)[0]; // 第二条=专科技能
  const drills = trainings.filter((t) => t.drill).length;

  const research = RESEARCH_LEDGER[period] ?? { papers: 0, patents: 0, qcc: 0 };

  // 演示合格率（确定性：38/40、22/24）
  const basicCarePassRate = ratio(sanji?.passed, sanji?.trainees);
  const criticalCarePassRate = ratio(specialty?.passed, specialty?.trainees);

  const rcaDoneRate =
    ADVERSE_EVENT_LEDGER.length > 0
      ? Math.round(
          (ADVERSE_EVENT_LEDGER.filter((e) => e.rcaDone).length /
            ADVERSE_EVENT_LEDGER.length) *
            1000,
        ) / 1000
      : 0;

  const sentinel = ADVERSE_EVENT_LEDGER.filter((e) => e.level === 'sentinel').length;

  return {
    period,
    basicCarePassRate,
    criticalCarePassRate,
    adverseEvents: ADVERSE_EVENT_LEDGER,
    adverseEventCount: ADVERSE_EVENT_LEDGER.length,
    rcaDoneRate,
    training: {
      sanjiSanyanPassRate: basicCarePassRate,
      specialtyPassRate: criticalCarePassRate,
      emergencyDrills: drills,
    },
    research: {
      papers: research.papers,
      patents: research.patents,
      qualityControlCircles: research.qcc,
    },
    summary:
      `本期基础护理合格率 ${(basicCarePassRate * 100).toFixed(1)}%、` +
      `危重护理合格率 ${(criticalCarePassRate * 100).toFixed(1)}%；` +
      `不良事件 ${ADVERSE_EVENT_LEDGER.length} 起（警讯 ${sentinel} 起），` +
      `根因分析完成率 ${(rcaDoneRate * 100).toFixed(0)}%。` +
      '质量问题先查流程与人力配置，不与个人奖金简单挂钩——护理管理是支持，不是监控。',
  };
}

function ratio(passed?: number, trainees?: number): number {
  if (!trainees || trainees <= 0) return 0;
  return Math.round(((passed ?? 0) / trainees) * 1000) / 1000;
}

/* ------------------------------- 纯函数四：深度护理管理驾驶舱 ------------------------------- */

/**
 * buildDeepNursingMgmt()
 * 一次性返回护理管理驾驶舱：排班人力（床护比 + 加班关怀）+ 质量报告 + 培训 + 科研。
 */
export function buildDeepNursingMgmt() {
  // 排班：每个病区算床护比 + 加班关怀
  const wards = WARD_LEDGER.map((w) => {
    const ratioRes = calculateNursingRatio(w.ward, w.patients, w.nursesOnDuty);
    const overtimeAlert = w.overtimeHours > OVERTIME_CARE_LIMIT_HOURS;
    return {
      ...w,
      ratio: ratioRes,
      overtimeAlert,
      overtimeNote: overtimeAlert
        ? `本月加班 ${w.overtimeHours}h，已超 ${OVERTIME_CARE_LIMIT_HOURS}h，建议安排调休、增补人力（保护护士）。`
        : `本月加班 ${w.overtimeHours}h，在关怀阈值内。`,
    };
  });

  const totalPatients = wards.reduce((s, w) => s + w.patients, 0);
  const totalNurses = wards.reduce((s, w) => s + w.nursesOnDuty, 0);
  const understaffedWards = wards.filter((w) => w.ratio.status === 'understaffed');
  const overtimeAlerts = wards.filter((w) => w.overtimeAlert);

  const quality = generateNursingQualityReport('2026Q3');

  return {
    generatedAt: new Date().toISOString(),
    careCharter: '护理管理要真关心护士，不是监控：缺人补位、加班调休、质量查流程、培训给路径、科研给时间。',
    scheduling: {
      wards,
      totalPatients,
      totalNurses,
      avgPatientsPerNurse:
        totalNurses > 0
          ? Math.round((totalPatients / totalNurses) * 100) / 100
          : 0,
      understaffedWardCount: understaffedWards.length,
      overtimeAlertCount: overtimeAlerts.length,
      overtimeCareLimitHours: OVERTIME_CARE_LIMIT_HOURS,
    },
    quality,
    demo: true,
  };
}
