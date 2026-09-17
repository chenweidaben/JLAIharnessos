/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室管理与运营场景 - 类型定义
 * 指标口径依据《国家医疗保障 DRG/DIP 分组与付费技术规范》《医疗质量管理办法》
 * 《三级医院绩效考核操作手册》及公立医院高质量发展评价指标体系
 */
import type { Gender } from './common';

/* ------------------------------ 科室基础信息 ------------------------------ */

/** 科室类别 */
export type DeptCategory =
  'internal' | 'surgery' | 'emergency' | 'icu' | 'outpatient' | 'auxiliary';

/** 科室信息 */
export interface DepartmentInfo {
  deptId: string;
  name: string; // 科室名称
  category: DeptCategory;
  director: string; // 科主任
  headNurse: string; // 护士长
  address: string; // 病区位置
  bedTotal: number; // 编制床位数
  bedOpen: number; // 实际开放床位数
  inPatient: number; // 当前在院人数
  doctorCount: number; // 医生数
  nurseCount: number; // 护士数
  technicianCount: number; // 技师数
  introduction: string; // 科室简介
  establishedYear: number; // 建科年份
  specialties: string[]; // 亚专业组
}

/* ------------------------------ 床位使用 ------------------------------ */

/** 床位状态 */
export type BedStatus = 'in' | 'empty' | 'pre_discharge' | 'isolated';

/** 单张床位 */
export interface BedInfo {
  bedNo: string; // 床号
  status: BedStatus;
  patientName?: string; // 脱敏
  level?: '普通' | '一级' | '病危' | '病重';
}

/** 床位使用情况 */
export interface BedUsage {
  beds: BedInfo[];
  occupancyRate: number; // 床位使用率 %
  preDischargeCount: number; // 预出院
  isolatedCount: number; // 隔离床
  /** 近30天床位使用率趋势 */
  occupancyTrend: { date: string; rate: number }[];
}

/* ------------------------------ 核心指标 ------------------------------ */

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'flat';

/** 核心指标卡片 */
export interface CoreMetric {
  key: string;
  name: string;
  value: number | string;
  unit: string;
  /** 同比/环比变化 % */
  trend: number;
  /** 目标值（用于进度条/达标判断） */
  target?: number;
  /** 指标性质：up_good=升高为好 down_good=降低为好 range=区间最优 */
  direction: 'up_good' | 'down_good' | 'range';
  /** 达标状态 */
  status: 'good' | 'warn' | 'bad';
}

/** 今日动态 */
export interface TodayActivity {
  newAdmission: number; // 新入院
  discharge: number; // 出院
  surgery: number; // 手术
  critical: number; // 危急值
  pendingTasks: number; // 待处理事项
}

/** 全院科室排名项 */
export interface DeptRankItem {
  metric: string;
  rank: number; // 本院排名
  total: number; // 全院科室总数
  value: number;
}

/** 科室概览数据 */
export interface OverviewData {
  coreMetrics: CoreMetric[];
  bedUsage: BedUsage;
  today: TodayActivity;
  ranking: DeptRankItem[];
}

/* ------------------------------ 运营分析 ------------------------------ */

/** 时间粒度 */
export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** 通用趋势点 */
export interface TrendPoint {
  label: string;
  value: number;
}

/** 工作量排名项 */
export interface WorkloadRankItem {
  name: string;
  value: number;
  rank?: number;
}

/** 疾病谱分布 */
export interface DiseaseDistItem {
  name: string; // 诊断名称
  icd: string; // ICD-10
  count: number;
  ratio: number; // 占比 %
}

/** 费用结构项 */
export interface FeeStructureItem {
  name: string;
  amount: number; // 金额（万元）
  ratio: number; // 占比 %
}

/** 门诊分析 */
export interface OutpatientAnalysis {
  visitTrend: TrendPoint[]; // 门诊量趋势
  doctorWorkload: WorkloadRankItem[]; // 医生工作量排名
  diseaseTop10: DiseaseDistItem[]; // 疾病谱 TOP10
  avgVisitCost: number; // 次均门诊费用
  drugRatio: number; // 药占比 %
  examRatio: number; // 检查占比 %
  appointmentRate: number; // 预约率 %
  noShowRate: number; // 爽约率 %
  avgWaitMinutes: number; // 平均候诊分钟
}

/** 住院转归 */
export interface OutcomeDistribution {
  cureRate: number; // 治愈率 %
  improveRate: number; // 好转率 %
  deathRate: number; // 死亡率 %
  unhealRate: number; // 未愈率 %
}

/** 住院分析 */
export interface InpatientAnalysis {
  dischargeTrend: TrendPoint[]; // 出院人数趋势
  occupancyTrend: TrendPoint[]; // 床位使用率趋势
  losTrend: TrendPoint[]; // 平均住院日趋势
  diseaseTop10: DiseaseDistItem[]; // 住院疾病谱
  avgStayCost: number; // 次均住院费用
  drugRatio: number; // 药占比 %
  consumableRatio: number; // 耗占比 %
  examRatio: number; // 检查占比 %
  outcome: OutcomeDistribution;
}

/** 手术分级 */
export type SurgeryLevel = 'level1' | 'level2' | 'level3' | 'level4';

/** 手术分析 */
export interface SurgeryAnalysis {
  volumeTrend: TrendPoint[]; // 手术量趋势
  levelDist: { level: SurgeryLevel; name: string; count: number; ratio: number }[];
  doctorWorkload: WorkloadRankItem[]; // 手术医生工作量排名
  typeDist: { name: string; value: number }[]; // 手术类型分布
  complicationRate: number; // 并发症率 %
  avgDurationMinutes: number; // 平均手术时长（分钟）
}

/** 费用分析 */
export interface FeeAnalysis {
  revenueTrend: { label: string; outpatient: number; inpatient: number }[]; // 收入趋势
  structure: FeeStructureItem[]; // 收入结构
  avgCostCompare: { name: string; value: number; benchmark: number }[]; // 次均费用对比
  insuranceRatio: number; // 医保比例 %
  selfPayRatio: number; // 自费比例 %
}

/** 运营分析汇总 */
export interface OperationAnalysis {
  outpatient: OutpatientAnalysis;
  inpatient: InpatientAnalysis;
  surgery: SurgeryAnalysis;
  fee: FeeAnalysis;
}

/* ------------------------------ DRG/DIP ------------------------------ */

/** 盈亏状态 */
export type ProfitStatus = 'profit' | 'balance' | 'loss';

/** DRG 分组记录 */
export interface DRGGroup {
  groupCode: string; // DRG 组编码
  groupName: string; // 组名
  weight: number; // 权重 RW
  caseCount: number; // 例数
  totalCost: number; // 总费用（万元）
  avgCost: number; // 平均费用（元）
  stdCost: number; // 标准费用（元）
  avgLOS: number; // 平均住院日
  stdLOS: number; // 标准住院日
  profit: number; // 盈亏金额（万元，正=盈 负=亏）
  profitStatus: ProfitStatus;
  costDeviation: number; // 费用偏差 %
  timeDeviation: number; // 时间偏差 %
  doctor: string; // 主诊医生
  lowRiskDeath: boolean; // 是否低风险死亡
}

/** 散点图气泡 */
export interface ScatterBubble {
  costDev: number; // X：费用偏差
  timeDev: number; // Y：时间偏差
  count: number; // 气泡大小：例数
  groupName: string;
}

/** 盈亏总览 */
export interface ProfitOverview {
  profitCount: number;
  lossCount: number;
  balanceCount: number;
  profitAmount: number; // 万元
  lossAmount: number; // 万元
  netProfit: number; // 净盈亏 万元
}

/** 费用偏差分布区间 */
export interface DeviationBin {
  range: string;
  count: number;
}

/** 标杆对比项 */
export interface BenchmarkItem {
  metric: string;
  deptValue: number;
  national: number;
  provincial: number;
  peerDept: number;
  unit: string;
}

/** AI 改进建议 */
export interface ImprovementAdvice {
  drgGroup: string;
  reason: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  expectedBenefit: string;
}

/** DRG/DIP 分析 */
export interface DRGDAnalysis {
  /** 概览 */
  groupingRate: number; // 入组率 %
  coveredGroups: number; // 覆盖 DRG 组数
  cmi: number; // 病例组合指数
  timeEfficiencyIndex: number; // 时间消耗指数
  costEfficiencyIndex: number; // 费用消耗指数
  lowRiskMortality: number; // 低风险死亡率 %
  lowMidRiskMortality: number; // 中低风险死亡率 %
  /** 分组列表 */
  groups: DRGGroup[];
  /** 盈亏 */
  profitOverview: ProfitOverview;
  scatter: ScatterBubble[];
  /** 偏差 */
  costDevDist: DeviationBin[];
  timeDevDist: DeviationBin[];
  highCostCases: { groupName: string; avgCost: number; multiple: number }[]; // 超标准倍数
  /** 标杆 */
  benchmarks: BenchmarkItem[];
  /** 建议 */
  advices: ImprovementAdvice[];
  /** 盈亏趋势 */
  profitTrend: { month: string; net: number }[];
}

/* ------------------------------ 质量指标 ------------------------------ */

/** 单病种指标 */
export interface SingleDiseaseQuality {
  disease: string;
  code: string;
  items: { name: string; rate: number; benchmark: number; trend: TrendPoint[] }[];
}

/** 合理用药指标 */
export interface RationalDrug {
  drugRatio: number; // 药占比 %
  abxOutpatientRate: number; // 门诊抗菌药物使用率 %
  abxInpatientRate: number; // 住院抗菌药物使用率 %
  abxDDS: number; // 抗菌药物使用强度 DDDs
  essentialDrugRate: number; // 基本药物使用率 %
  centralizedDrugRate: number; // 国家集采药品使用率 %
  prescriptionQualified: number; // 处方合格率 %
}

/** 核心制度执行 */
export interface CoreSystemRate {
  name: string;
  rate: number; // 执行率 %
}

/** 质量指标概览 */
export interface QualityIndicators {
  cureRate: number;
  improveRate: number;
  deathRate: number;
  unhealRate: number;
  readmitRate: number; // 31天再入院率
  unplannedReopRate: number; // 非计划再手术率
  surgeryComplicationRate: number; // 手术并发症率
  infectionRate: number; // 医院感染率
  pressureUlcerRate: number; // 压疮发生率
  fallRate: number; // 跌倒发生率
  satisfaction: number; // 患者满意度
  /** 单病种 */
  singleDiseases: SingleDiseaseQuality[];
  /** 核心制度 */
  coreSystems: CoreSystemRate[];
  /** 合理用药 */
  rationalDrug: RationalDrug;
  /** 合理检查 */
  examRatio: number;
  largeDevicePositiveRate: number; // 大型设备检查阳性率 %
  repeatExamRate: number; // 重复检查率 %
  /** 趋势 */
  monthlyTrend: {
    month: string;
    cureRate: number;
    deathRate: number;
    satisfaction: number;
  }[];
  /** 预警指标（低于阈值） */
  warnings: { name: string; value: number; threshold: number }[];
  /** 质量排名 */
  deptQualityRank: WorkloadRankItem[];
  doctorQualityRank: WorkloadRankItem[];
}

/* ------------------------------ 人员管理 ------------------------------ */

/** 人员分类 */
export type StaffCategory = 'doctor' | 'nurse' | 'technician' | 'admin';

/** 人员状态 */
export type StaffStatus = 'active' | 'leave' | 'out' | 'resigned';

/** 职称 */
export type DoctorTitle =
  | '主任医师'
  | '副主任医师'
  | '主治医师'
  | '住院医师'
  | '主任护师'
  | '副主任护师'
  | '主管护师'
  | '护师'
  | '护士'
  | '技师'
  | '主管技师';

/** 人员信息 */
export interface StaffInfo {
  staffId: string;
  name: string;
  gender: Gender;
  age: number;
  category: StaffCategory;
  title: DoctorTitle; // 职称
  position?: string; // 职务（主任/护士长/组长）
  specialty: string; // 专业
  education: '博士' | '硕士' | '本科' | '大专' | '中专';
  hireDate: string; // 入职时间
  licenseNo: string; // 执业证号
  qualificationNo: string; // 资格证号
  practiceScope: string; // 执业范围
  prescriptionRight: boolean; // 处方权
  surgeryLevel: '一级' | '二级' | '三级' | '四级' | '无'; // 手术权限
  abxLevel: '非限制' | '限制' | '特殊使用'; // 抗菌药物权限
  status: StaffStatus;
  educationHistory: { school: string; degree: string; period: string }[];
  awards: string[];
  trainingHours: number; // 继教学分
  certExpire: { cert: string; expireDate: string }[];
}

/** 班次 */
export type ShiftType = 'day' | 'night' | 'mid' | 'off' | 'leave';

/** 排班记录 */
export interface Schedule {
  scheduleId: string;
  staffId: string;
  staffName: string;
  category: StaffCategory;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
}

/** 绩效指标 */
export interface Performance {
  staffId: string;
  staffName: string;
  outpatientCount: number; // 门诊量
  dischargeCount: number; // 出院人数
  surgeryCount: number; // 手术量
  recordCount: number; // 病历数
  recordQualifiedRate: number; // 病历合格率 %
  qcScore: number; // 质控得分
  satisfaction: number; // 满意度
  avgLOS: number; // 平均住院日
  occupancyRate: number; // 床位使用率 %
  revenue: number; // 业务收入（万元）
  cost: number; // 成本（万元）
  balance: number; // 结余（万元）
  score: number; // 绩效得分
  rank: number;
  trend: number; // 同比 %
}

/** 人员统计 */
export interface StaffStats {
  ageDist: { range: string; count: number }[];
  titleDist: { name: string; count: number }[];
  educationDist: { name: string; count: number }[];
  genderDist: { name: string; count: number }[];
  doctorNurseRatio: string; // 医护比
  bedNurseRatio: string; // 床护比
  monthlyJoinLeave: { month: string; join: number; leave: number }[];
}

/* ------------------------------ 设备与物资 ------------------------------ */

/** 设备分类 */
export type EquipmentCategory = 'large' | 'routine' | 'emergency' | 'monitor';

/** 设备状态 */
export type EquipmentStatus = 'normal' | 'repair' | 'scrap' | 'idle';

/** 设备维保记录 */
export interface MaintenanceRecord {
  date: string;
  type: '保养' | '维修' | '校准';
  vendor: string;
  cost: number;
  result: string;
}

/** 设备信息 */
export interface EquipmentInfo {
  equipId: string;
  name: string;
  model: string;
  vendor: string; // 厂家
  purchaseDate: string;
  value: number; // 价值（万元）
  category: EquipmentCategory;
  status: EquipmentStatus;
  dept: string;
  usageHours: number; // 本月开机小时
  usageRate: number; // 使用率 %
  faultRate: number; // 故障率 %
  lastMaintenance: string;
  nextMaintenance: string; // 维保到期
  nextCalibration: string; // 校准到期
  monthlyRevenue: number; // 月收入（万元）
  paybackMonths: number; // 投资回收期（月）
  maintenanceLog: MaintenanceRecord[];
}

/** 耗材类别 */
export type ConsumableCategory = 'high_value' | 'ordinary';

/** 耗材 */
export interface Consumable {
  consumableId: string;
  name: string;
  spec: string; // 规格
  model: string;
  vendor: string;
  unit: string;
  unitPrice: number; // 单价（元）
  stock: number;
  safetyStock: number; // 安全库存
  expiryDate: string;
  category: ConsumableCategory;
  monthlyUsage: number; // 月用量
  traceEnabled: boolean; // 是否高值追溯
  supplier: string;
}

/** 库存预警 */
export interface InventoryAlert {
  consumableId: string;
  name: string;
  type: 'low_stock' | 'expiring' | 'out_of_date';
  message: string;
}

/** 设备物资统计 */
export interface EquipmentStats {
  equipCountByCategory: { category: string; count: number }[];
  equipStatusDist: { name: string; value: number }[];
  consumableTrend: { month: string; amount: number }[];
  costAnalysis: { name: string; cost: number }[];
}
