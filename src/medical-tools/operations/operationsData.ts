/**
 * 健澜科技数智医院智能体 - 运营管理Mock数据
 *
 * 提供科室运营指标、医疗质量指标、DRG/DIP分组等模拟数据。
 * 所有数据均为虚构，仅供工具开发与测试，不代表真实医院运营情况。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 科室运营月度指标
// ============================================================================

/** 科室运营月度指标 */
export interface MockDepartmentOperation {
  department: string;
  month: string; // YYYY-MM
  outpatientVisits: number; // 门诊人次
  emergencyVisits: number; // 急诊人次
  inpatientAdmissions: number; // 入院人次
  dischargeCount: number; // 出院人数
  avgLengthOfStay: number; // 平均住院日（天）
  bedCount: number; // 开放床位
  bedOccupancyRate: number; // 床位使用率（%）
  revenueWan: number; // 科室收入（万元）
  costWan: number; // 科室成本（万元）
  drugProportion: number; // 药占比（%）
  examinationProportion: number; // 检查检验占比（%）
  avgCostPerDischarge: number; // 次均出院费用（元）
}

/** 近6个月各科室运营指标（2026-04 ~ 2026-09） */
export const MOCK_DEPARTMENT_OPERATIONS: MockDepartmentOperation[] = [
  {
    department: '心血管内科',
    month: '2026-09',
    outpatientVisits: 4820,
    emergencyVisits: 320,
    inpatientAdmissions: 286,
    dischargeCount: 275,
    avgLengthOfStay: 7.8,
    bedCount: 60,
    bedOccupancyRate: 96.5,
    revenueWan: 1280,
    costWan: 940,
    drugProportion: 28.4,
    examinationProportion: 32.1,
    avgCostPerDischarge: 18600,
  },
  {
    department: '呼吸内科',
    month: '2026-09',
    outpatientVisits: 3650,
    emergencyVisits: 410,
    inpatientAdmissions: 240,
    dischargeCount: 231,
    avgLengthOfStay: 8.9,
    bedCount: 55,
    bedOccupancyRate: 102.3,
    revenueWan: 980,
    costWan: 760,
    drugProportion: 35.2,
    examinationProportion: 26.8,
    avgCostPerDischarge: 15400,
  },
  {
    department: '消化内科',
    month: '2026-09',
    outpatientVisits: 4100,
    emergencyVisits: 180,
    inpatientAdmissions: 198,
    dischargeCount: 192,
    avgLengthOfStay: 6.5,
    bedCount: 45,
    bedOccupancyRate: 88.7,
    revenueWan: 820,
    costWan: 610,
    drugProportion: 30.5,
    examinationProportion: 30.2,
    avgCostPerDischarge: 12800,
  },
  {
    department: '内分泌科',
    month: '2026-09',
    outpatientVisits: 3200,
    emergencyVisits: 90,
    inpatientAdmissions: 150,
    dischargeCount: 146,
    avgLengthOfStay: 6.2,
    bedCount: 40,
    bedOccupancyRate: 82.4,
    revenueWan: 690,
    costWan: 520,
    drugProportion: 33.8,
    examinationProportion: 28.5,
    avgCostPerDischarge: 11200,
  },
  {
    department: '神经内科',
    month: '2026-09',
    outpatientVisits: 2900,
    emergencyVisits: 360,
    inpatientAdmissions: 210,
    dischargeCount: 201,
    avgLengthOfStay: 9.6,
    bedCount: 50,
    bedOccupancyRate: 94.2,
    revenueWan: 910,
    costWan: 700,
    drugProportion: 31.6,
    examinationProportion: 34.2,
    avgCostPerDischarge: 16800,
  },
  // 上月数据（用于环比）
  {
    department: '心血管内科',
    month: '2026-08',
    outpatientVisits: 4500,
    emergencyVisits: 300,
    inpatientAdmissions: 260,
    dischargeCount: 250,
    avgLengthOfStay: 8.1,
    bedCount: 60,
    bedOccupancyRate: 94.0,
    revenueWan: 1190,
    costWan: 900,
    drugProportion: 29.8,
    examinationProportion: 31.0,
    avgCostPerDischarge: 18200,
  },
  {
    department: '呼吸内科',
    month: '2026-08',
    outpatientVisits: 3900,
    emergencyVisits: 380,
    inpatientAdmissions: 250,
    dischargeCount: 240,
    avgLengthOfStay: 9.2,
    bedCount: 55,
    bedOccupancyRate: 98.6,
    revenueWan: 1010,
    costWan: 780,
    drugProportion: 36.5,
    examinationProportion: 25.9,
    avgCostPerDischarge: 15900,
  },
  {
    department: '消化内科',
    month: '2026-08',
    outpatientVisits: 3950,
    emergencyVisits: 170,
    inpatientAdmissions: 185,
    dischargeCount: 180,
    avgLengthOfStay: 6.8,
    bedCount: 45,
    bedOccupancyRate: 86.0,
    revenueWan: 790,
    costWan: 590,
    drugProportion: 31.2,
    examinationProportion: 29.5,
    avgCostPerDischarge: 12600,
  },
];

// ============================================================================
// 医疗质量指标
// ============================================================================

/** 医疗质量指标 */
export interface MockQualityIndicator {
  department: string | null; // null 表示全院
  month: string;
  indicatorType: '效率' | '安全' | '质量' | '合理用药';
  indicatorName: string;
  value: number;
  unit: string;
  benchmark: number; // 行业基准/目标值
  benchmarkDirection: 'higher-better' | 'lower-better';
  warning: boolean; // 是否偏离基准
}

export const MOCK_QUALITY_INDICATORS: MockQualityIndicator[] = [
  {
    department: null,
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: '出院31天再住院率',
    value: 2.8,
    unit: '%',
    benchmark: 3.5,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: null,
    month: '2026-09',
    indicatorType: '安全',
    indicatorName: '住院患者跌倒发生率',
    value: 0.03,
    unit: '‰',
    benchmark: 0.05,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: null,
    month: '2026-09',
    indicatorType: '安全',
    indicatorName: '手术并发症发生率',
    value: 1.2,
    unit: '%',
    benchmark: 1.5,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: null,
    month: '2026-09',
    indicatorType: '合理用药',
    indicatorName: '抗菌药物使用强度(DDDs/100人天)',
    value: 42.5,
    unit: 'DDDs',
    benchmark: 40,
    benchmarkDirection: 'lower-better',
    warning: true,
  },
  {
    department: null,
    month: '2026-09',
    indicatorType: '合理用药',
    indicatorName: '住院患者抗菌药物使用率',
    value: 52.0,
    unit: '%',
    benchmark: 60,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: null,
    month: '2026-09',
    indicatorType: '效率',
    indicatorName: '平均住院日',
    value: 8.2,
    unit: '天',
    benchmark: 8.5,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: '心血管内科',
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: 'STEMI患者门-球时间(D-to-B)达标率',
    value: 91.0,
    unit: '%',
    benchmark: 90,
    benchmarkDirection: 'higher-better',
    warning: false,
  },
  {
    department: '心血管内科',
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: '急性心衰指南药物使用率',
    value: 86.0,
    unit: '%',
    benchmark: 80,
    benchmarkDirection: 'higher-better',
    warning: false,
  },
  {
    department: '呼吸内科',
    month: '2026-09',
    indicatorType: '合理用药',
    indicatorName: '门诊抗菌药物处方率',
    value: 18.5,
    unit: '%',
    benchmark: 20,
    benchmarkDirection: 'lower-better',
    warning: false,
  },
  {
    department: '呼吸内科',
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: '住院患者血气分析及时完成率',
    value: 94.0,
    unit: '%',
    benchmark: 95,
    benchmarkDirection: 'higher-better',
    warning: true,
  },
  {
    department: '神经内科',
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: '急性缺血性卒中静脉溶栓率',
    value: 24.5,
    unit: '%',
    benchmark: 25,
    benchmarkDirection: 'higher-better',
    warning: true,
  },
  {
    department: '神经内科',
    month: '2026-09',
    indicatorType: '质量',
    indicatorName: '卒中患者入院48小时内抗栓治疗率',
    value: 96.0,
    unit: '%',
    benchmark: 95,
    benchmarkDirection: 'higher-better',
    warning: false,
  },
];

// ============================================================================
// DRG/DIP 分组数据
// ============================================================================

/** DRG/DIP 病例分组记录 */
export interface MockDrgCase {
  caseId: string;
  patientId: string;
  encounterId: string;
  department: string;
  drgGroup: string; // DRG组（如FM1急性心梗）
  drgGroupName: string;
  weight: number; // 权重
  totalCost: number; // 本次住院总费用（元）
  paidAmount: number; // DRG/DIP付费金额（元）
  riskLevel: '低风险' | '中风险' | '高风险';
  outlierFlag: '正常' | '低标费用' | '高标费用';
  losDays: number; // 住院天数
  dischargeStatus: '治愈' | '好转' | '未愈' | '死亡';
  month: string;
}

/** DRG组基准费率（模拟） */
export const DRG_BASE_RATE = 9800; // 每权重支付基准（元）

export const MOCK_DRG_CASES: MockDrgCase[] = [
  {
    caseId: 'DC20260901001',
    patientId: 'P2026090001',
    encounterId: 'E20260901002',
    department: '心血管内科',
    drgGroup: 'FM1',
    drgGroupName: '急性心肌梗死伴合并症',
    weight: 2.85,
    totalCost: 52000,
    paidAmount: Math.round(2.85 * DRG_BASE_RATE),
    riskLevel: '高风险',
    outlierFlag: '高标费用',
    losDays: 9,
    dischargeStatus: '好转',
    month: '2026-09',
  },
  {
    caseId: 'DC20260910002',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    department: '呼吸内科',
    drgGroup: 'ES1',
    drgGroupName: '呼吸道感染伴合并症',
    weight: 1.42,
    totalCost: 18600,
    paidAmount: Math.round(1.42 * DRG_BASE_RATE),
    riskLevel: '中风险',
    outlierFlag: '正常',
    losDays: 8,
    dischargeStatus: '好转',
    month: '2026-09',
  },
  {
    caseId: 'DC20260914003',
    patientId: 'P2026090005',
    encounterId: 'E20260914006',
    department: '神经内科',
    drgGroup: 'BR1',
    drgGroupName: '急性缺血性卒中伴溶栓',
    weight: 3.1,
    totalCost: 47500,
    paidAmount: Math.round(3.1 * DRG_BASE_RATE),
    riskLevel: '高风险',
    outlierFlag: '正常',
    losDays: 6,
    dischargeStatus: '好转',
    month: '2026-09',
  },
  {
    caseId: 'DC20260911004',
    patientId: 'P2026090003',
    encounterId: 'E20260911007',
    department: '消化内科',
    drgGroup: 'GB3',
    drgGroupName: '消化道炎症无合并症',
    weight: 0.72,
    totalCost: 6800,
    paidAmount: Math.round(0.72 * DRG_BASE_RATE),
    riskLevel: '低风险',
    outlierFlag: '低标费用',
    losDays: 3,
    dischargeStatus: '治愈',
    month: '2026-09',
  },
];
