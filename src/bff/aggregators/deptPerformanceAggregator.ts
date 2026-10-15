/**
 * 健澜科技 jlmedaios - 科室绩效分析聚合（管理驾驶舱 M127-B）
 *
 * 五大维度：工作量 / 效率 / 质量 / 满意度 / 智慧资产。
 * 全部为纯函数：入参为上层汇总好的科室原始数据，本模块不触库、不发起网络请求，
 * 便于单元测试与 BFF 路由复用。
 *
 * 评分口径（每项 0-100，超过目标封顶 100）：
 *  - 工作量 = 门诊/目标*40% + 出院/目标*35% + 手术/目标*25%；
 *  - 效率   = 床位周转/目标*40% + 候诊目标/候诊*30% + 住院日目标/住院日*30%（后两项越低越好）；
 *  - 质量   = 病历质控合格率*50% + 甲级病历率*50%；
 *  - 满意度 = 满意度/100*70% + 投诉目标/投诉率*30%（投诉为 0 时该项记满分）；
 *  - 智慧资产 = AI 病历采纳率/目标*40% + 知识库贡献/目标*30% + 模板复用/目标*30%。
 * 综合得分 = Σ 维度分 * 权重（25/25/25/15/10），保留 1 位小数；
 * 等级：≥90 A，≥80 B，≥70 C，其余 D。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 绩效维度 key */
export type DimensionKey =
  | 'workload'
  | 'efficiency'
  | 'quality'
  | 'satisfaction'
  | 'smartAssets';

/** 维度元数据（权重合计 = 1） */
export interface DimensionMeta {
  key: DimensionKey;
  label: string;
  /** 综合得分权重 */
  weight: number;
}

/** 五大维度定义（管理驾驶舱） */
export const DIMENSIONS: DimensionMeta[] = [
  { key: 'workload', label: '工作量', weight: 0.25 },
  { key: 'efficiency', label: '效率', weight: 0.25 },
  { key: 'quality', label: '质量', weight: 0.25 },
  { key: 'satisfaction', label: '满意度', weight: 0.15 },
  { key: 'smartAssets', label: '智慧资产', weight: 0.1 },
];

/**
 * 科室原始绩效数据（由 BFF 路由从各业务库汇总后传入）。
 * 周期口径由调用方约定（月 / 季 / 年），timeRange 仅做展示。
 */
export interface DeptRawData {
  deptCode: string;
  deptName: string;
  /* ---------- 工作量 ---------- */
  /** 周期内门诊人次 */
  outpatientCount: number;
  /** 周期内出院人次 */
  dischargedCount: number;
  /** 周期内手术台次 */
  surgeryCount: number;
  /* ---------- 效率 ---------- */
  /** 平均住院日（天），越低越好 */
  avgLodDays: number;
  /** 床位周转次数，越高越好 */
  bedTurnover: number;
  /** 平均候诊时长（分钟），越低越好 */
  avgWaitMinutes: number;
  /* ---------- 质量 ---------- */
  /** 病历质控合格率 0-1 */
  qcPassRate: number;
  /** 甲级病历率 0-1 */
  gradeARate: number;
  /* ---------- 满意度 ---------- */
  /** 患者满意度 0-100 */
  patientSatisfaction: number;
  /** 投诉率 0-1，越低越好 */
  complaintRate: number;
  /* ---------- 智慧资产 ---------- */
  /** AI 病历采纳率 0-1 */
  aiNoteAdoption: number;
  /** 周期内知识库贡献条数 */
  knowledgeContrib: number;
  /** 周期内模板复用次数 */
  templateReuse: number;
}

/** 单维度得分 */
export interface DimensionScore extends DimensionMeta {
  /** 0-100，保留 1 位小数 */
  score: number;
}

/** 绩效等级 */
export type PerfGrade = 'A' | 'B' | 'C' | 'D';

/** 科室绩效报告 */
export interface DeptPerformance {
  deptCode: string;
  deptName: string;
  /** 展示用时间范围，如「2026-10」 */
  timeRange: string;
  dimensions: DimensionScore[];
  /** 综合得分 0-100 */
  totalScore: number;
  grade: PerfGrade;
}

/** 排名表行 */
export interface RankedDept {
  deptCode: string;
  deptName: string;
  /** 1 起，按综合得分降序 */
  rank: number;
  totalScore: number;
  grade: PerfGrade;
  dimensions: DimensionScore[];
}

/* ------------------------------- 内部工具 ------------------------------- */

/** 评分基线（管理驾驶舱目标值） */
const BASELINE = {
  outpatient: 2000, // 月门诊目标人次
  discharged: 300, // 月出院目标人次
  surgery: 80, // 月手术目标台次
  lodDays: 7, // 平均住院日目标（天，越低越好）
  bedTurnover: 2.5, // 床位周转目标（次）
  waitMinutes: 30, // 候诊目标（分钟，越低越好）
  satisfaction: 90, // 满意度目标分
  complaint: 0.005, // 投诉率目标（越低越好）
  aiAdoption: 0.6, // AI 病历采纳率目标
  knowledge: 20, // 月知识库贡献目标（条）
  templateReuse: 200, // 月模板复用目标（次）
} as const;

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** 越高越好：value/target，封顶 1 */
const ratioUp = (v: number, target: number): number =>
  target > 0 ? clamp(v / target) : 0;

/** 越低越好：target/value，value=0 记满分 1 */
const ratioDown = (v: number, target: number): number =>
  v > 0 ? clamp(target / v) : 1;

/** 单维度得分（0-100） */
function scoreDimension(key: DimensionKey, d: DeptRawData): number {
  switch (key) {
    case 'workload': {
      const s =
        ratioUp(d.outpatientCount, BASELINE.outpatient) * 0.4 +
        ratioUp(d.dischargedCount, BASELINE.discharged) * 0.35 +
        ratioUp(d.surgeryCount, BASELINE.surgery) * 0.25;
      return s * 100;
    }
    case 'efficiency': {
      const s =
        ratioUp(d.bedTurnover, BASELINE.bedTurnover) * 0.4 +
        ratioDown(d.avgWaitMinutes, BASELINE.waitMinutes) * 0.3 +
        ratioDown(d.avgLodDays, BASELINE.lodDays) * 0.3;
      return s * 100;
    }
    case 'quality': {
      return (clamp(d.qcPassRate) * 0.5 + clamp(d.gradeARate) * 0.5) * 100;
    }
    case 'satisfaction': {
      const s =
        clamp(d.patientSatisfaction, 0, 100) / 100 * 0.7 +
        ratioDown(d.complaintRate, BASELINE.complaint) * 0.3;
      return s * 100;
    }
    case 'smartAssets': {
      const s =
        ratioUp(d.aiNoteAdoption, BASELINE.aiAdoption) * 0.4 +
        ratioUp(d.knowledgeContrib, BASELINE.knowledge) * 0.3 +
        ratioUp(d.templateReuse, BASELINE.templateReuse) * 0.3;
      return s * 100;
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

/* ------------------------------- 纯函数导出 ------------------------------- */

/**
 * 纯函数：构建单个科室的绩效报告。
 * @param deptCode 科室编码（在 data 中查找；未找到抛错，由路由映射为 400）
 * @param timeRange 展示用时间范围
 * @param data 周期内全部科室原始数据
 */
export function buildDeptPerformanceReport(
  deptCode: string,
  timeRange: string,
  data: DeptRawData[],
): DeptPerformance {
  const raw = data.find((d) => d.deptCode === deptCode);
  if (!raw) throw new Error(`科室不存在: ${deptCode}`);

  const dimensions: DimensionScore[] = DIMENSIONS.map((meta) => ({
    ...meta,
    score: round1(scoreDimension(meta.key, raw)),
  }));
  const totalScore = round1(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    deptCode: raw.deptCode,
    deptName: raw.deptName,
    timeRange,
    dimensions,
    totalScore,
    grade: gradeOf(totalScore),
  };
}

/**
 * 纯函数：对全部科室按综合得分降序排名，名次从 1 起。
 */
export function rankDepts(allDepts: DeptRawData[]): RankedDept[] {
  return allDepts
    .map((raw) => {
      const r = buildDeptPerformanceReport(raw.deptCode, '', [raw]);
      return {
        deptCode: r.deptCode,
        deptName: r.deptName,
        rank: 0,
        totalScore: r.totalScore,
        grade: r.grade,
        dimensions: r.dimensions,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));
}

/* ------------------------------- 演示数据集（路由兜底） ------------------------------- */
/* 管理驾驶舱：未接业务库实时汇总前，BFF 以此内存数据驱动页面；
   后续接入 visitRepo / drgRepo / terminalQcRepo 时仅替换数据源，纯函数不变。 */

export const DEMO_DEPT_PERF_DATA: DeptRawData[] = [
  {
    deptCode: 'D001', deptName: '心血管内科',
    outpatientCount: 2400, dischargedCount: 320, surgeryCount: 60,
    avgLodDays: 6.5, bedTurnover: 2.8, avgWaitMinutes: 25,
    qcPassRate: 0.98, gradeARate: 0.92,
    patientSatisfaction: 94, complaintRate: 0.002,
    aiNoteAdoption: 0.72, knowledgeContrib: 26, templateReuse: 240,
  },
  {
    deptCode: 'D002', deptName: '普通外科',
    outpatientCount: 1800, dischargedCount: 280, surgeryCount: 110,
    avgLodDays: 8.2, bedTurnover: 2.2, avgWaitMinutes: 35,
    qcPassRate: 0.94, gradeARate: 0.85,
    patientSatisfaction: 86, complaintRate: 0.006,
    aiNoteAdoption: 0.55, knowledgeContrib: 18, templateReuse: 180,
  },
  {
    deptCode: 'D003', deptName: '神经内科',
    outpatientCount: 2100, dischargedCount: 260, surgeryCount: 20,
    avgLodDays: 7.8, bedTurnover: 2.0, avgWaitMinutes: 28,
    qcPassRate: 0.96, gradeARate: 0.88,
    patientSatisfaction: 90, complaintRate: 0.004,
    aiNoteAdoption: 0.66, knowledgeContrib: 22, templateReuse: 150,
  },
  {
    deptCode: 'D004', deptName: '骨科',
    outpatientCount: 1500, dischargedCount: 220, surgeryCount: 130,
    avgLodDays: 9.5, bedTurnover: 1.8, avgWaitMinutes: 42,
    qcPassRate: 0.9, gradeARate: 0.78,
    patientSatisfaction: 82, complaintRate: 0.008,
    aiNoteAdoption: 0.48, knowledgeContrib: 12, templateReuse: 160,
  },
  {
    deptCode: 'D005', deptName: '儿科',
    outpatientCount: 3200, dischargedCount: 180, surgeryCount: 15,
    avgLodDays: 5.2, bedTurnover: 3.2, avgWaitMinutes: 38,
    qcPassRate: 0.97, gradeARate: 0.9,
    patientSatisfaction: 88, complaintRate: 0.005,
    aiNoteAdoption: 0.5, knowledgeContrib: 14, templateReuse: 210,
  },
  {
    deptCode: 'D006', deptName: '呼吸与危重症医学科',
    outpatientCount: 1700, dischargedCount: 290, surgeryCount: 10,
    avgLodDays: 8.8, bedTurnover: 2.1, avgWaitMinutes: 30,
    qcPassRate: 0.93, gradeARate: 0.82,
    patientSatisfaction: 85, complaintRate: 0.007,
    aiNoteAdoption: 0.6, knowledgeContrib: 20, templateReuse: 190,
  },
];
