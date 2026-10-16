/**
 * 健澜科技 jlmedaios - M178-B 医院人力资源深化——公平阳光聚合器
 *
 * 【财务人力行政党建】人力资源要公平，不能暗箱操作。
 *
 *   - buildDeepHRMgmt()           纯函数：深度人力资源管理驾驶舱（编制/招聘/培训/绩效四维总览）
 *   - calculateStaffingGap(dept) 纯函数：人员缺口计算（编制数+实有人数+缺编率）
 *   - trackTrainingRecord(staffId, period) 纯函数：培训记录跟踪（学分达标判定，不送学分）
 *   - calculatePerformancePay(staffId, period) 纯函数：绩效工资计算（KPI 权重公开、公式列化可复算）
 *
 * 公平设计红线：
 *   1) 招聘面试 ≥3 名评委独立打分，去掉一个最高分、一个最低分后取均值，杜绝一人拍板；
 *   2) 绩效工资公式公开：KPI 权重（质量40%/效率30%/满意度20%/协作10%）写死在代码里，
 *      系数分段透明（90+ →1.3，80~89 →1.2 ……），任何人拿工资条都能自己复算；
 *   3) 学分达标由规则判定（已修学分 ≥ 应修学分），不搞领导特批送学分；
 *   4) 所有函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用。
 *
 * 内置演示台账与 deploy/postgres/init/361-hr-deep.sql 种子对齐，空库即可演示。
 *
 * 【远期】接入真实 HRP/HR 系统后由数据回写替换内置台账；本切片不做 WebSocket 推送。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 科室编码 */
export type DeptCode = 'IN' | 'SU' | 'NU' | 'RD';

/** 考核周期 */
export type HRPeriod = string; // 如 '2026H1' | '2026Q3' | '2026'

/** 一个科室的编制台账 */
export interface DeptEstablishment {
  dept: DeptCode;
  deptName: string;
  /** 编制数 */
  authorized: number;
  /** 实有人数 */
  actual: number;
  /** 缺编数 = 编制数 - 实有人数（负=超编） */
  vacant: number;
  /** 缺编率 = 缺编数 / 编制数（0..1，超编为负） */
  gapRate: number;
  /** 编制状态标签 */
  status: 'shortage' | 'balanced' | 'overstaffed';
}

/** 单个候选人面试评分留痕 */
export interface InterviewScore {
  candidateNo: string;
  reviewerCount: number;
  /** 各评委原始分（≥3） */
  rawScores: number[];
  /** 去掉最高最低后的均分（公平计算） */
  trimmedMean: number;
  hired: boolean;
}

/** 一条招聘需求漏斗 */
export interface RecruitmentRequisition {
  requisitionId: string;
  dept: DeptCode;
  position: string;
  stage: 'requisition' | 'screened' | 'interviewing' | 'offered' | 'hired' | 'rejected';
  candidates: InterviewScore[];
  /** 已录用人数 */
  hiredCount: number;
}

/** 一条培训记录 */
export interface TrainingRecord {
  course: string;
  category: 'general' | 'clinical' | 'management' | 'safety';
  credits: number;
  period: string;
  status: 'planned' | 'done' | 'expired';
}

/** 培训学分跟踪结果 */
export interface TrainingTrackResult {
  staffId: string;
  period: string;
  records: TrainingRecord[];
  /** 应修学分（职称公开标准） */
  requiredCredits: number;
  /** 已修学分（仅统计 done） */
  earnedCredits: number;
  /** 未完成学分缺口 */
  creditGap: number;
  /** 是否达标 */
  compliant: boolean;
  /** 公平说明：学分按认定规则累加，不搞领导送学分 */
  fairnessNote: string;
}

/** KPI 四维得分（权重公开） */
export interface KpiBreakdown {
  quality: number;    // 医疗质量 40%
  efficiency: number; // 工作效率 30%
  service: number;    // 患者满意度 20%
  collab: number;     // 协作与教学 10%
}

/** 绩效工资计算结果（公式全透明） */
export interface PerformancePayResult {
  staffId: string;
  period: string;
  kpi: KpiBreakdown;
  /** 加权总分 0..100 */
  weightedScore: number;
  /** 绩效系数（由加权分映射，分段公开） */
  coefficient: number;
  /** 基本工资 */
  baseSalary: number;
  /** 绩效工资 = 基本工资 × 系数 */
  performancePay: number;
  /** 从科室奖金池切分的奖金（按个人得分占科室总分比） */
  bonusShare: number;
  /** 应发合计 = 绩效工资 + 奖金 */
  totalPay: number;
  /** 公式说明（任何人可复算） */
  formula: string;
}

/** buildDeepHRMgmt 返回的整院阳光人力驾驶舱 */
export interface DeepHRMgmtView {
  generatedAt: string;
  /** 编制总览 */
  establishment: {
    byDept: DeptEstablishment[];
    totalAuthorized: number;
    totalActual: number;
    totalVacant: number;
    avgGapRate: number;
  };
  /** 招聘漏斗 */
  recruitment: {
    requisitions: RecruitmentRequisition[];
    openPositions: number;
    hiredThisPeriod: number;
    /** 招聘公平声明：≥3 评委、去最高最低取均值 */
    fairnessRule: string;
  };
  /** 培训学分总览 */
  training: {
    requiredStandard: number;
    compliantCount: number;
    totalStaff: number;
    complianceRate: number;
  };
  /** 绩效总览 */
  performance: {
    avgScore: number;
    avgCoefficient: number;
    bonusPoolTotal: number;
    /** KPI 权重公开 */
    weights: { quality: number; efficiency: number; service: number; collab: number };
  };
  /** 公平主张（页头展示） */
  fairnessCharter: string;
  demo: boolean;
}

/* ------------------------------- 内置演示台账（与 361-hr-deep.sql 种子对齐） ------------------------------- */

interface StaffLedger {
  staffId: string;
  name: string;
  dept: DeptCode;
  deptName: string;
  title: string;
  positionLevel: number;
  authorized: number;
  actual: number;
  baseSalary: number;
  perfPool: number;
  requiredCredits: number;
}

const STAFF_LEDGER: StaffLedger[] = [
  { staffId: 'S1001', name: '陈医生', dept: 'IN', deptName: '心内科',   title: '主任医师',   positionLevel: 9, authorized: 12, actual: 10, baseSalary: 18000, perfPool: 60000, requiredCredits: 25 },
  { staffId: 'S1002', name: '林医生', dept: 'IN', deptName: '心内科',   title: '副主任医师', positionLevel: 7, authorized: 12, actual: 10, baseSalary: 14000, perfPool: 60000, requiredCredits: 25 },
  { staffId: 'S1003', name: '王医生', dept: 'IN', deptName: '心内科',   title: '主治医师',   positionLevel: 5, authorized: 12, actual: 10, baseSalary: 10000, perfPool: 60000, requiredCredits: 25 },
  { staffId: 'S2001', name: '赵医生', dept: 'SU', deptName: '普外科',   title: '主任医师',   positionLevel: 9, authorized: 15, actual: 12, baseSalary: 18000, perfPool: 70000, requiredCredits: 25 },
  { staffId: 'S2002', name: '周医生', dept: 'SU', deptName: '普外科',   title: '主治医师',   positionLevel: 5, authorized: 15, actual: 12, baseSalary: 10000, perfPool: 70000, requiredCredits: 25 },
  { staffId: 'S3001', name: '李护士长', dept: 'NU', deptName: '护理部', title: '副主任护师', positionLevel: 6, authorized: 60, actual: 55, baseSalary: 9000, perfPool: 90000, requiredCredits: 25 },
  { staffId: 'S3002', name: '吴护士', dept: 'NU', deptName: '护理部',   title: '护师',       positionLevel: 3, authorized: 60, actual: 55, baseSalary: 6500, perfPool: 90000, requiredCredits: 25 },
  { staffId: 'S4001', name: '钱技师', dept: 'RD', deptName: '检验科',   title: '主管技师',   positionLevel: 5, authorized: 8,  actual: 8,  baseSalary: 9500, perfPool: 30000, requiredCredits: 25 },
];

/** 招聘需求 + 候选人评分（评委分已落台账） */
const RECRUIT_LEDGER: RecruitmentRequisition[] = [
  {
    requisitionId: 'REQ-2026-01', dept: 'IN', position: '心内科主治医师', stage: 'interviewing',
    candidates: [
      { candidateNo: 'C-101', reviewerCount: 3, rawScores: [88, 92, 90], trimmedMean: 90.0, hired: false },
      { candidateNo: 'C-102', reviewerCount: 3, rawScores: [85, 89, 87], trimmedMean: 87.0, hired: false },
      { candidateNo: 'C-103', reviewerCount: 3, rawScores: [95, 70, 88], trimmedMean: 88.0, hired: false },
    ],
    hiredCount: 0,
  },
  {
    requisitionId: 'REQ-2026-02', dept: 'SU', position: '普外科住院医师', stage: 'offered',
    candidates: [
      { candidateNo: 'C-201', reviewerCount: 4, rawScores: [86, 90, 84, 88], trimmedMean: 87.33, hired: true },
      { candidateNo: 'C-202', reviewerCount: 4, rawScores: [70, 72, 68, 71], trimmedMean: 70.33, hired: false },
    ],
    hiredCount: 1,
  },
];

/** 培训记录台账 */
const TRAINING_LEDGER: (TrainingRecord & { staffId: string })[] = [
  { staffId: 'S1001', course: '心血管新进展',       category: 'clinical',   credits: 8.0,  period: '2026', status: 'done' },
  { staffId: 'S1001', course: '医疗质量安全核心制度', category: 'safety',     credits: 6.0,  period: '2026', status: 'done' },
  { staffId: 'S1001', course: '科室管理与沟通',     category: 'management', credits: 8.0,  period: '2026', status: 'planned' },
  { staffId: 'S1003', course: '心电诊断进阶',       category: 'clinical',   credits: 10.0, period: '2026', status: 'done' },
  { staffId: 'S1003', course: '医患沟通实务',       category: 'general',    credits: 8.0,  period: '2026', status: 'done' },
  { staffId: 'S2002', course: '外科围手术期管理',   category: 'clinical',   credits: 12.0, period: '2026', status: 'planned' },
  { staffId: 'S3002', course: '静脉治疗护理规范',   category: 'clinical',   credits: 9.0,  period: '2026', status: 'done' },
];

/** KPI 台账（各员工各周期四维得分） */
const KPI_LEDGER: Record<string, Record<string, KpiBreakdown>> = {
  S1001: { '2026H1': { quality: 90, efficiency: 88, service: 86, collab: 88 } },
  S1002: { '2026H1': { quality: 82, efficiency: 80, service: 85, collab: 83 } },
  S1003: { '2026H1': { quality: 70, efficiency: 72, service: 75, collab: 70 } },
  S2001: { '2026H1': { quality: 94, efficiency: 90, service: 92, collab: 91 } },
  S2002: { '2026H1': { quality: 62, efficiency: 66, service: 70, collab: 60 } },
  S3001: { '2026H1': { quality: 86, efficiency: 84, service: 88, collab: 85 } },
  S3002: { '2026H1': { quality: 70, efficiency: 68, service: 72, collab: 71 } },
  S4001: { '2026H1': { quality: 78, efficiency: 80, service: 76, collab: 78 } },
};

/* ------------------------------- 公平规则常量（公开，写死） ------------------------------- */

/** KPI 四维权重（合计 100%，公开不可黑箱） */
export const KPI_WEIGHTS = Object.freeze({
  quality: 0.4,
  efficiency: 0.3,
  service: 0.2,
  collab: 0.1,
});

/**
 * 绩效系数分段映射（公开规则，写在明处）：
 *   加权分 ≥90 → 1.30（优秀）
 *   80~89.99   → 1.20（良好）
 *   70~79.99   → 1.00（称职）
 *   60~69.99   → 0.90（基本称职）
 *   <60        → 0.80（待改进）
 */
export function coefficientOf(weightedScore: number): number {
  if (weightedScore >= 90) return 1.3;
  if (weightedScore >= 80) return 1.2;
  if (weightedScore >= 70) return 1.0;
  if (weightedScore >= 60) return 0.9;
  return 0.8;
}

/**
 * 公平打分：去掉一个最高分、一个最低分后取均值（评委 ≥3 才去两端）。
 * 这是招聘面试不暗箱的核心算法。
 */
export function trimmedMeanOf(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length <= 2) {
    return scores.reduce((s, v) => s + v, 0) / scores.length;
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const inner = sorted.slice(1, sorted.length - 1);
  const sum = inner.reduce((s, v) => s + v, 0);
  return Math.round((sum / inner.length) * 100) / 100;
}

/* ------------------------------- 纯函数一：人员缺口计算 ------------------------------- */

/** 汇总单个科室的编制缺口 */
function establishmentOf(dept: DeptCode): DeptEstablishment {
  const rows = STAFF_LEDGER.filter((s) => s.dept === dept);
  // 编制/实有人数以科室首行台账为准（科室级冗余字段）
  const head = rows[0];
  const authorized = head?.authorized ?? 0;
  const actual = head?.actual ?? 0;
  const vacant = authorized - actual;
  const gapRate = authorized > 0 ? Math.round((vacant / authorized) * 1000) / 1000 : 0;
  const status: DeptEstablishment['status'] =
    vacant > 0 ? 'shortage' : vacant < 0 ? 'overstaffed' : 'balanced';
  return {
    dept,
    deptName: head?.deptName ?? dept,
    authorized,
    actual,
    vacant,
    gapRate,
    status,
  };
}

/**
 * calculateStaffingGap(dept, period)
 * 人员缺口计算：编制数 + 实有人数 + 缺编率。
 * @param dept   可选；传科室编码则只返回该科室，不传=全院各科室
 * @param period 可选；保留参数（月度/季度缺口趋势在远期接真实数据后启用），当前为确定性快照
 */
export function calculateStaffingGap(dept?: string, period: HRPeriod = '2026H1'): {
  period: string;
  byDept: DeptEstablishment[];
  totalAuthorized: number;
  totalActual: number;
  totalVacant: number;
  avgGapRate: number;
} {
  const allDepts: DeptCode[] = ['IN', 'SU', 'NU', 'RD'];
  // 空 / 未知科室编码 → 回退全院（与其他模块一致）；已知科室才精确过滤
  const scoped = dept && (allDepts as string[]).includes(dept)
    ? (allDepts.filter((d) => d === dept) as DeptCode[])
    : allDepts;
  const byDept = scoped.map(establishmentOf);

  const totalAuthorized = byDept.reduce((s, d) => s + d.authorized, 0);
  const totalActual = byDept.reduce((s, d) => s + d.actual, 0);
  const totalVacant = totalAuthorized - totalActual;
  const avgGapRate =
    totalAuthorized > 0 ? Math.round((totalVacant / totalAuthorized) * 1000) / 1000 : 0;

  return { period, byDept, totalAuthorized, totalActual, totalVacant, avgGapRate };
}

/* ------------------------------- 纯函数二：培训记录跟踪 ------------------------------- */

/**
 * trackTrainingRecord(staffId, period)
 * 培训记录跟踪：列出该员工周期内培训记录，累加已修学分，与应修学分比对判定达标。
 * 公平：学分只认「done」状态的课程，planned/expired 不计入，领导不能口头送学分。
 */
export function trackTrainingRecord(staffId: string, period: HRPeriod = '2026'): TrainingTrackResult {
  const staff = STAFF_LEDGER.find((s) => s.staffId === staffId);
  if (!staff) {
    throw new Error(`员工不存在：${staffId}（培训跟踪失败）`);
  }

  const records: TrainingRecord[] = TRAINING_LEDGER.filter(
    (r) => r.staffId === staffId && r.period === period,
  ).map(({ course, category, credits, status }) => ({ course, category, credits, period, status }));

  const earnedCredits = Math.round(
    records.filter((r) => r.status === 'done').reduce((s, r) => s + r.credits, 0) * 10,
  ) / 10;
  const requiredCredits = staff.requiredCredits;
  const creditGap = Math.round((requiredCredits - earnedCredits) * 10) / 10;

  return {
    staffId,
    period,
    records,
    requiredCredits,
    earnedCredits,
    creditGap: creditGap > 0 ? creditGap : 0,
    compliant: earnedCredits >= requiredCredits,
    fairnessNote: '学分仅按已完成课程认定，应修标准公开，不接受口头送学分',
  };
}

/* ------------------------------- 纯函数三：绩效工资计算 ------------------------------- */

/**
 * calculatePerformancePay(staffId, period)
 * 绩效工资计算：KPI 四维加权得分 → 绩效系数 → 绩效工资 = 基本工资 × 系数，
 * 另按个人加权分占科室总分比切分科室奖金池。
 * 公平：权重、系数分段、切分公式全部公开，工资条可逐项复算。
 */
export function calculatePerformancePay(staffId: string, period: HRPeriod = '2026H1'): PerformancePayResult {
  const staff = STAFF_LEDGER.find((s) => s.staffId === staffId);
  if (!staff) {
    throw new Error(`员工不存在：${staffId}（绩效工资计算失败）`);
  }
  const kpi = KPI_LEDGER[staffId]?.[period];
  if (!kpi) {
    throw new Error(`未找到 ${staffId} 在周期 ${period} 的 KPI 考核记录`);
  }

  // 1) 加权总分（权重公开 40/30/20/10）
  const weightedScore = Math.round(
    (kpi.quality * KPI_WEIGHTS.quality +
      kpi.efficiency * KPI_WEIGHTS.efficiency +
      kpi.service * KPI_WEIGHTS.service +
      kpi.collab * KPI_WEIGHTS.collab) * 100,
  ) / 100;

  // 2) 绩效系数（分段公开）
  const coefficient = coefficientOf(weightedScore);

  // 3) 绩效工资 = 基本工资 × 系数
  const performancePay = Math.round(staff.baseSalary * coefficient * 100) / 100;

  // 4) 奖金切分：个人加权分 / 同科室同周期加权分之和 × 科室奖金池
  const deptPeers = STAFF_LEDGER.filter((s) => s.dept === staff.dept);
  let deptScoreSum = 0;
  for (const p of deptPeers) {
    const pk = KPI_LEDGER[p.staffId]?.[period];
    if (pk) {
      deptScoreSum +=
        pk.quality * KPI_WEIGHTS.quality +
        pk.efficiency * KPI_WEIGHTS.efficiency +
        pk.service * KPI_WEIGHTS.service +
        pk.collab * KPI_WEIGHTS.collab;
    }
  }
  const bonusShare =
    deptScoreSum > 0
      ? Math.round((weightedScore / deptScoreSum) * staff.perfPool * 100) / 100
      : 0;

  return {
    staffId,
    period,
    kpi,
    weightedScore,
    coefficient,
    baseSalary: staff.baseSalary,
    performancePay,
    bonusShare,
    totalPay: Math.round((performancePay + bonusShare) * 100) / 100,
    formula:
      '加权分=质量×0.4+效率×0.3+满意度×0.2+协作×0.1；' +
      '系数按分段(≥90→1.3,80→1.2,70→1.0,60→0.9,<60→0.8)；' +
      '绩效工资=基本工资×系数；奖金=个人分/科室总分×科室奖金池',
  };
}

/* ------------------------------- 纯函数四：深度人力资源管理驾驶舱 ------------------------------- */

/**
 * buildDeepHRMgmt()
 * 一次性返回阳光人力驾驶舱所需全部派生数据：编制总览 + 招聘漏斗 + 培训达标 + 绩效汇总。
 */
export function buildDeepHRMgmt(): DeepHRMgmtView {
  // 编制
  const gap = calculateStaffingGap();

  // 招聘：复算 trimmedMean（公平），统计开放岗位与本期录用
  const requisitions: RecruitmentRequisition[] = RECRUIT_LEDGER.map((r) => ({
    ...r,
    candidates: r.candidates.map((c) => ({
      ...c,
      trimmedMean: trimmedMeanOf(c.rawScores),
    })),
    hiredCount: r.candidates.filter((c) => c.hired).length,
  }));
  const openPositions = requisitions.filter((r) => r.stage !== 'hired' && r.stage !== 'rejected').length;
  const hiredThisPeriod = requisitions.reduce((s, r) => s + r.hiredCount, 0);

  // 培训达标（全院）
  let compliantCount = 0;
  for (const s of STAFF_LEDGER) {
    const t = trackTrainingRecord(s.staffId, '2026');
    if (t.compliant) compliantCount += 1;
  }
  const totalStaff = STAFF_LEDGER.length;

  // 绩效汇总（全院平均加权分 / 平均系数 / 奖金池合计）
  let scoreSum = 0;
  let coefSum = 0;
  let scored = 0;
  for (const s of STAFF_LEDGER) {
    const r = calculatePerformancePay(s.staffId, '2026H1');
    scoreSum += r.weightedScore;
    coefSum += r.coefficient;
    scored += 1;
  }
  const bonusPoolTotal = STAFF_LEDGER.reduce((s, x) => s + x.perfPool, 0);

  return {
    generatedAt: new Date().toISOString(),
    establishment: {
      byDept: gap.byDept,
      totalAuthorized: gap.totalAuthorized,
      totalActual: gap.totalActual,
      totalVacant: gap.totalVacant,
      avgGapRate: gap.avgGapRate,
    },
    recruitment: {
      requisitions,
      openPositions,
      hiredThisPeriod,
      fairnessRule: '每个岗位 ≥3 名评委独立打分，去掉一个最高分、一个最低分后取均分录用，全程留痕',
    },
    training: {
      requiredStandard: 25,
      compliantCount,
      totalStaff,
      complianceRate: totalStaff > 0 ? Math.round((compliantCount / totalStaff) * 1000) / 1000 : 0,
    },
    performance: {
      avgScore: scored > 0 ? Math.round((scoreSum / scored) * 100) / 100 : 0,
      avgCoefficient: scored > 0 ? Math.round((coefSum / scored) * 100) / 100 : 0,
      bonusPoolTotal,
      weights: KPI_WEIGHTS,
    },
    fairnessCharter: '编制公开、招聘透明、学分认规则、绩效算公式——人力资源要公平，不能暗箱操作。',
    demo: true,
  };
}
