/**
 * 健澜科技 jlmedaios - 个人绩效考核聚合（医院管理深化 M140-A）
 *
 * 【医院管理深化】公平透明，每个得分都有依据。
 * 五维权重（合计 = 1）：
 *   工作量 30% / 医疗质量 25% / 患者满意度 20% / 学习成长 15% / 科室协作 10%
 *
 * 全部为纯函数：入参为上层汇总好的员工周期原始指标，本模块不触库、不发起网络请求，
 * 便于单元测试与 BFF 路由复用。每个维度分都附带 evidence 证据链（原始值 / 基线 /
 * 方向 / 折算贡献），员工可申诉、管理者可审计。
 *
 * 评分口径（每项 0-100，超过基线封顶 100）：
 *  - 工作量 = 接诊/目标*40% + 管床住院日/目标*35% + 手术台次/目标*25%；
 *  - 医疗质量 = 病历质控合格率*40% + 甲级病历率*35% + 合理用药检查符合率*25%；
 *  - 患者满意度 = 满意度分/100*70% + 投诉目标/投诉*30%（投诉为 0 时该项记满分）；
 *  - 学习成长 = 培训学时/目标*40% + 继教学分/目标*35% + 知识库贡献/目标*25%；
 *  - 科室协作 = 跨科会诊/目标*40% + 交接班差错折算*30% + 同事互评/100*30%
 *              （差错 0 记满分，每差错一次扣 0.2，扣完为止）。
 * 综合得分 = Σ 维度分 * 权重，保留 1 位小数；
 * 等级：≥90 A，≥80 B，≥70 C，其余 D。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 绩效维度 key */
export type DimensionKey =
  | 'workload'
  | 'medicalQuality'
  | 'patientSatisfaction'
  | 'learningGrowth'
  | 'deptCollaboration';

/** 维度元数据（权重合计 = 1） */
export interface DimensionMeta {
  key: DimensionKey;
  label: string;
  /** 综合得分权重 */
  weight: number;
}

/** 五大考核维度（医院管理深化） */
export const PERF_DIMENSIONS: DimensionMeta[] = [
  { key: 'workload', label: '工作量', weight: 0.3 },
  { key: 'medicalQuality', label: '医疗质量', weight: 0.25 },
  { key: 'patientSatisfaction', label: '患者满意度', weight: 0.2 },
  { key: 'learningGrowth', label: '学习成长', weight: 0.15 },
  { key: 'deptCollaboration', label: '科室协作', weight: 0.1 },
];

/**
 * 员工周期原始指标（由 BFF 路由从各业务库汇总后传入）。
 * 周期口径由调用方约定（月 / 季 / 年），period 仅做展示与对账。
 */
export interface StaffRawData {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  /* ---------- 工作量（30%） ---------- */
  /** 周期内接诊人次 */
  outpatientVisits: number;
  /** 周期内管床住院日 */
  inpatientDays: number;
  /** 周期内手术台次 */
  surgeryCount: number;
  /* ---------- 医疗质量（25%） ---------- */
  /** 病历质控合格率 0-1 */
  qcPassRate: number;
  /** 甲级病历率 0-1 */
  gradeARate: number;
  /** 合理用药 / 合理检查符合率 0-1 */
  complianceRate: number;
  /* ---------- 患者满意度（20%） ---------- */
  /** 患者满意度分 0-100 */
  satisfactionScore: number;
  /** 投诉率 0-1，越低越好 */
  complaintRate: number;
  /* ---------- 学习成长（15%） ---------- */
  /** 周期内培训学时 */
  trainingHours: number;
  /** 周期内继续教育学分 */
  continuingCredits: number;
  /** 周期内知识库贡献条数 */
  knowledgeContrib: number;
  /* ---------- 科室协作（10%） ---------- */
  /** 周期内跨科会诊次数 */
  crossDeptConsult: number;
  /** 周期内交接班差错次数，越低越好（0 记满分） */
  handoverErrors: number;
  /** 同事互评 0-100 */
  peerScore: number;
}

/** 单条指标的公平透明证据 */
export interface MetricEvidence {
  /** 指标中文名 */
  metric: string;
  /** 原始值 */
  raw: number;
  /** 目标 / 基线值 */
  baseline: number;
  /** 越高越好 / 越低越好 */
  direction: 'up' | 'down';
  /** 折算到 0-1 的贡献占比（×100 即该指标在维度内的得分贡献） */
  contribution: number;
}

/** 单维度得分（含证据链） */
export interface DimensionScore extends DimensionMeta {
  /** 0-100，保留 1 位小数 */
  score: number;
  /** 该维度每一分的来源留痕 */
  evidence: MetricEvidence[];
}

/** 绩效等级 */
export type PerfGrade = 'A' | 'B' | 'C' | 'D';

/** 单个员工的绩效考评结果（纯函数 calculatePerformanceScore 返回值） */
export interface Score {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  /** 账期，如 2026-10 */
  period: string;
  dimensions: DimensionScore[];
  /** 综合得分 0-100 */
  totalScore: number;
  grade: PerfGrade;
}

/** 排名表行（纯函数 generateRanking 返回值） */
export interface Ranking {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  /** 1 起，按综合得分降序 */
  rank: number;
  totalScore: number;
  grade: PerfGrade;
  dimensions: DimensionScore[];
}

/* ------------------------------- 内部工具 ------------------------------- */

/** 评分基线（医院管理深化目标值） */
const BASELINE = {
  outpatient: 800, // 月接诊人次目标
  inpatientDays: 60, // 月管床住院日目标
  surgery: 20, // 月手术台次目标
  satisfaction: 90, // 满意度目标分
  complaint: 0.005, // 投诉率目标（越低越好）
  trainingHours: 24, // 月培训学时目标
  continuingCredits: 10, // 继教学分目标
  knowledge: 5, // 月知识库贡献目标（条）
  crossDeptConsult: 8, // 月跨科会诊目标（次）
} as const;

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** 越高越好：value/target，封顶 1 */
const ratioUp = (v: number, target: number): number =>
  target > 0 ? clamp(v / target) : 0;

/** 越低越好：target/value，value=0 记满分 1 */
const ratioDown = (v: number, target: number): number =>
  v > 0 ? clamp(target / v) : 1;

/** 交接班差错：0 记满分，每差错一次扣 0.2，扣完为止 */
const handoverQuality = (errors: number): number =>
  errors <= 0 ? 1 : clamp(1 - errors * 0.2);

/** 单维度得分（0-100）+ 证据链 */
function scoreDimension(
  key: DimensionKey,
  d: StaffRawData,
): { score: number; evidence: MetricEvidence[] } {
  switch (key) {
    case 'workload': {
      const e1 = ratioUp(d.outpatientVisits, BASELINE.outpatient);
      const e2 = ratioUp(d.inpatientDays, BASELINE.inpatientDays);
      const e3 = ratioUp(d.surgeryCount, BASELINE.surgery);
      return {
        score: round1((e1 * 0.4 + e2 * 0.35 + e3 * 0.25) * 100),
        evidence: [
          { metric: '接诊人次', raw: d.outpatientVisits, baseline: BASELINE.outpatient, direction: 'up', contribution: round1(e1 * 0.4 * 10) / 10 },
          { metric: '管床住院日', raw: d.inpatientDays, baseline: BASELINE.inpatientDays, direction: 'up', contribution: round1(e2 * 0.35 * 10) / 10 },
          { metric: '手术台次', raw: d.surgeryCount, baseline: BASELINE.surgery, direction: 'up', contribution: round1(e3 * 0.25 * 10) / 10 },
        ],
      };
    }
    case 'medicalQuality': {
      const e1 = clamp(d.qcPassRate);
      const e2 = clamp(d.gradeARate);
      const e3 = clamp(d.complianceRate);
      return {
        score: round1((e1 * 0.4 + e2 * 0.35 + e3 * 0.25) * 100),
        evidence: [
          { metric: '病历质控合格率', raw: d.qcPassRate, baseline: 1, direction: 'up', contribution: round1(e1 * 0.4 * 10) / 10 },
          { metric: '甲级病历率', raw: d.gradeARate, baseline: 1, direction: 'up', contribution: round1(e2 * 0.35 * 10) / 10 },
          { metric: '合理用药检查符合率', raw: d.complianceRate, baseline: 1, direction: 'up', contribution: round1(e3 * 0.25 * 10) / 10 },
        ],
      };
    }
    case 'patientSatisfaction': {
      const e1 = clamp(d.satisfactionScore, 0, 100) / 100;
      const e2 = ratioDown(d.complaintRate, BASELINE.complaint);
      return {
        score: round1((e1 * 0.7 + e2 * 0.3) * 100),
        evidence: [
          { metric: '患者满意度分', raw: d.satisfactionScore, baseline: 100, direction: 'up', contribution: round1(e1 * 0.7 * 10) / 10 },
          { metric: '投诉率', raw: d.complaintRate, baseline: BASELINE.complaint, direction: 'down', contribution: round1(e2 * 0.3 * 10) / 10 },
        ],
      };
    }
    case 'learningGrowth': {
      const e1 = ratioUp(d.trainingHours, BASELINE.trainingHours);
      const e2 = ratioUp(d.continuingCredits, BASELINE.continuingCredits);
      const e3 = ratioUp(d.knowledgeContrib, BASELINE.knowledge);
      return {
        score: round1((e1 * 0.4 + e2 * 0.35 + e3 * 0.25) * 100),
        evidence: [
          { metric: '培训学时', raw: d.trainingHours, baseline: BASELINE.trainingHours, direction: 'up', contribution: round1(e1 * 0.4 * 10) / 10 },
          { metric: '继续教育学分', raw: d.continuingCredits, baseline: BASELINE.continuingCredits, direction: 'up', contribution: round1(e2 * 0.35 * 10) / 10 },
          { metric: '知识库贡献', raw: d.knowledgeContrib, baseline: BASELINE.knowledge, direction: 'up', contribution: round1(e3 * 0.25 * 10) / 10 },
        ],
      };
    }
    case 'deptCollaboration': {
      const e1 = ratioUp(d.crossDeptConsult, BASELINE.crossDeptConsult);
      const e2 = handoverQuality(d.handoverErrors);
      const e3 = clamp(d.peerScore, 0, 100) / 100;
      return {
        score: round1((e1 * 0.4 + e2 * 0.3 + e3 * 0.3) * 100),
        evidence: [
          { metric: '跨科会诊次数', raw: d.crossDeptConsult, baseline: BASELINE.crossDeptConsult, direction: 'up', contribution: round1(e1 * 0.4 * 10) / 10 },
          { metric: '交接班差错次数', raw: d.handoverErrors, baseline: 0, direction: 'down', contribution: round1(e2 * 0.3 * 10) / 10 },
          { metric: '同事互评', raw: d.peerScore, baseline: 100, direction: 'up', contribution: round1(e3 * 0.3 * 10) / 10 },
        ],
      };
    }
  }
}

/** 综合得分 → 等级 */
function gradeOf(total: number): PerfGrade {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  return 'D';
}

/** 由原始指标构建完整考评结果（纯内部） */
function buildScore(raw: StaffRawData, period: string): Score {
  const dimensions: DimensionScore[] = PERF_DIMENSIONS.map((meta) => ({
    ...meta,
    ...scoreDimension(meta.key, raw),
  }));
  const totalScore = round1(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );
  return {
    staffId: raw.staffId,
    staffName: raw.staffName,
    deptCode: raw.deptCode,
    deptName: raw.deptName,
    period,
    dimensions,
    totalScore,
    grade: gradeOf(totalScore),
  };
}

/* ------------------------------- 纯函数导出 ------------------------------- */

/**
 * 纯函数：计算单个员工在某账期的绩效得分。
 * @param staffId 员工工号（在 data 中查找；未找到抛错，由路由映射为 400）
 * @param period 账期，如 2026-10
 * @param data 周期内全部员工原始指标（默认使用演示数据集，便于路由兜底与单测注入）
 */
export function calculatePerformanceScore(
  staffId: string,
  period: string,
  data: StaffRawData[] = DEMO_STAFF_PERF_DATA,
): Score {
  const raw = data.find((d) => d.staffId === staffId);
  if (!raw) throw new Error(`员工不存在: ${staffId}`);
  return buildScore(raw, period);
}

/**
 * 纯函数：生成某账期（可按科室过滤）的员工绩效排名，名次从 1 起按综合得分降序。
 * @param dept 科室编码；传空串或 'ALL' 表示全院排名
 * @param period 账期
 * @param data 周期内全部员工原始指标
 */
export function generateRanking(
  dept: string,
  period: string,
  data: StaffRawData[] = DEMO_STAFF_PERF_DATA,
): Ranking[] {
  const filtered =
    !dept || dept === 'ALL' ? data : data.filter((d) => d.deptCode === dept);
  return filtered
    .map((raw) => {
      const s = buildScore(raw, period);
      return {
        staffId: s.staffId,
        staffName: s.staffName,
        deptCode: s.deptCode,
        deptName: s.deptName,
        rank: 0,
        totalScore: s.totalScore,
        grade: s.grade,
        dimensions: s.dimensions,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));
}

/* ------------------------------- 演示数据集（路由兜底） ------------------------------- */
/* 医院管理深化：未接业务库实时汇总前，BFF 以此内存数据驱动页面；
   后续接入 IAM 员工表 / 工作量汇总 / 满意度调查 / 学习成长库时仅替换数据源，纯函数不变。 */

export const DEMO_STAFF_PERF_DATA: StaffRawData[] = [
  {
    staffId: 'E1001', staffName: '林致远', deptCode: 'D001', deptName: '心血管内科',
    outpatientVisits: 860, inpatientDays: 66, surgeryCount: 18,
    qcPassRate: 0.99, gradeARate: 0.95, complianceRate: 0.97,
    satisfactionScore: 96, complaintRate: 0.002,
    trainingHours: 28, continuingCredits: 12, knowledgeContrib: 7,
    crossDeptConsult: 10, handoverErrors: 0, peerScore: 95,
  },
  {
    staffId: 'E1002', staffName: '沈若琳', deptCode: 'D001', deptName: '心血管内科',
    outpatientVisits: 720, inpatientDays: 58, surgeryCount: 12,
    qcPassRate: 0.96, gradeARate: 0.9, complianceRate: 0.93,
    satisfactionScore: 91, complaintRate: 0.004,
    trainingHours: 22, continuingCredits: 9, knowledgeContrib: 5,
    crossDeptConsult: 7, handoverErrors: 1, peerScore: 88,
  },
  {
    staffId: 'E2001', staffName: '周明轩', deptCode: 'D002', deptName: '普通外科',
    outpatientVisits: 640, inpatientDays: 72, surgeryCount: 34,
    qcPassRate: 0.93, gradeARate: 0.86, complianceRate: 0.9,
    satisfactionScore: 87, complaintRate: 0.006,
    trainingHours: 18, continuingCredits: 8, knowledgeContrib: 4,
    crossDeptConsult: 9, handoverErrors: 2, peerScore: 84,
  },
  {
    staffId: 'E2002', staffName: '苏婉清', deptCode: 'D002', deptName: '普通外科',
    outpatientVisits: 580, inpatientDays: 60, surgeryCount: 26,
    qcPassRate: 0.9, gradeARate: 0.82, complianceRate: 0.88,
    satisfactionScore: 84, complaintRate: 0.008,
    trainingHours: 16, continuingCredits: 7, knowledgeContrib: 3,
    crossDeptConsult: 6, handoverErrors: 1, peerScore: 80,
  },
  {
    staffId: 'E3001', staffName: '陈砚书', deptCode: 'D003', deptName: '儿科',
    outpatientVisits: 1020, inpatientDays: 40, surgeryCount: 4,
    qcPassRate: 0.98, gradeARate: 0.93, complianceRate: 0.95,
    satisfactionScore: 95, complaintRate: 0.003,
    trainingHours: 26, continuingCredits: 11, knowledgeContrib: 6,
    crossDeptConsult: 5, handoverErrors: 0, peerScore: 92,
  },
  {
    staffId: 'E3002', staffName: '何静姝', deptCode: 'D003', deptName: '儿科',
    outpatientVisits: 780, inpatientDays: 34, surgeryCount: 2,
    qcPassRate: 0.88, gradeARate: 0.8, complianceRate: 0.85,
    satisfactionScore: 82, complaintRate: 0.009,
    trainingHours: 14, continuingCredits: 6, knowledgeContrib: 2,
    crossDeptConsult: 3, handoverErrors: 3, peerScore: 76,
  },
];
