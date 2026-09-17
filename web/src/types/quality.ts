/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质量管理（质控）场景 - 类型定义
 * 质控标准依据《病历书写基本规范》《医疗质量管理办法》《住院病案首页数据填写质量规范》
 */
import type { Gender } from './common';

/* ------------------------------ 枚举与基础类型 ------------------------------ */

/** 质控任务状态 */
export type QualityTaskStatus =
  | 'pending' // 待质控
  | 'checking' // 质控中
  | 'checked' // 已质控
  | 'to_rectify' // 待整改
  | 'rectified'; // 已整改

/** 病历类型 */
export type RecordType =
  '运行病历' | '出院病历' | '死亡病历' | '手术病历' | '门诊病历' | '急诊病历';

/** 缺陷类型 */
export type DefectType = 'integrity' | 'standardization' | 'logic' | 'timeliness';

/** 缺陷等级 */
export type DefectLevel = 'minor' | 'major' | 'critical';

/** 病历质量等级：甲级≥90、乙级75-89、丙级<75 */
export type RecordGrade = 'A' | 'B' | 'C';

/** 质控规则分类 */
export type RuleCategory = 'integrity' | 'standardization' | 'logic' | 'timeliness' | 'veto';

/** 规则状态 */
export type RuleStatus = 'enabled' | 'disabled';

/** 制度执行情况 */
export type SystemExecStatus = 'executed' | 'partial' | 'not_executed';

/** 整改任务状态 */
export type RectifyStatus = 'pending' | 'in_progress' | 'rectified' | 'reviewed';

/** 缺陷等级文案映射 */
export const DEFECT_TYPE_LABEL: Record<DefectType, string> = {
  integrity: '完整性缺陷',
  standardization: '规范性缺陷',
  logic: '逻辑性缺陷',
  timeliness: '时效性缺陷',
};

export const DEFECT_LEVEL_LABEL: Record<DefectLevel, string> = {
  minor: '一般缺陷',
  major: '重要缺陷',
  critical: '严重缺陷',
};

export const RULE_CATEGORY_LABEL: Record<RuleCategory, string> = {
  integrity: '完整性规则',
  standardization: '规范性规则',
  logic: '逻辑性规则',
  timeliness: '时效性规则',
  veto: '单项否决规则',
};

export const TASK_STATUS_LABEL: Record<QualityTaskStatus, string> = {
  pending: '待质控',
  checking: '质控中',
  checked: '已质控',
  to_rectify: '待整改',
  rectified: '已整改',
};

/* ------------------------------ 质控任务 ------------------------------ */

/** 质控任务项 */
export interface QualityTask {
  taskId: string;
  recordNo: string; // 病历号
  visitId: string; // 就诊号
  patientName: string; // 已脱敏
  gender: Gender;
  age: number;
  dept: string; // 科室
  ward: string; // 病区
  doctor: string; // 主管医生
  doctorTitle: string; // 医生职称
  recordType: RecordType;
  admitDate: string; // 入院日期
  dischargeDate?: string; // 出院日期
  status: QualityTaskStatus;
  qualityDoctor?: string; // 质控医生
  qualityTime?: string; // 质控时间
  score?: number;
  grade?: RecordGrade;
  defectCount?: number;
  priority: 'high' | 'normal' | 'low';
  deadline?: string; // 质控时限
}

/* ------------------------------ 质控缺陷 ------------------------------ */

/** 病历定位：章节 + 选中文本 + 字符偏移 */
export interface DefectLocation {
  section: string; // 病历章节
  anchor: string; // 命中/选中文本
  startOffset: number;
  endOffset: number;
}

/** 质控缺陷 */
export interface QualityDefect {
  defectId: string;
  ruleCode: string; // 命中规则编码
  type: DefectType;
  level: DefectLevel;
  description: string; // 缺陷描述
  deduction: number; // 扣分
  location: DefectLocation;
  suggestion: string; // 整改建议
  aiSuggested: boolean; // 是否AI自动识别
  /** AI建议处置：pending=待采纳 adopted=已采纳 modified=已修改 ignored=已忽略 */
  aiAction: 'pending' | 'adopted' | 'modified' | 'ignored';
}

/* ------------------------------ 病历章节与内容 ------------------------------ */

/** 病历章节 */
export interface RecordSection {
  id: string;
  title: string;
  content: string; // 富文本纯文本（演示用）
  editor: string; // 书写医生
  updatedAt: string;
}

/* ------------------------------ 质控结果 ------------------------------ */

/** 质控结果 */
export interface QualityResult {
  resultId: string;
  recordNo: string;
  score: number; // 百分制
  grade: RecordGrade; // 甲/乙/丙
  defects: QualityDefect[];
  vetoItems: string[]; // 单项否决项（出现即丙级）
  /** 主观质控意见 */
  overallComment: string;
  strengths: string;
  weaknesses: string;
  rectifyRequirement: string;
  qualityDoctor: string;
  qualityTime: string;
  signed: boolean;
}

/** 当前质控病历详情 */
export interface CurrentQualityRecord {
  task: QualityTask;
  sections: RecordSection[];
  result: QualityResult | null;
  /** AI 预识别缺陷（尚未确认） */
  aiDefects: QualityDefect[];
}

/* ------------------------------ 质控规则 ------------------------------ */

/** 规则条件（可视化编辑器） */
export interface RuleCondition {
  field: string; // 字段名
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'empty' | 'not_empty' | 'contains';
  value?: string;
  logic: 'and' | 'or';
}

/** 质控规则 */
export interface QualityRule {
  ruleId: string;
  code: string; // 规则编码
  name: string;
  description: string;
  category: RuleCategory;
  level: DefectLevel;
  deduction: number;
  conditions: RuleCondition[];
  suggestion: string; // 整改建议模板
  applicableRecordTypes: RecordType[];
  applicableDepts: string[]; // 空数组表示全部
  applicableDoctorTitles: string[];
  status: RuleStatus;
  version: string;
  updatedAt: string;
  updatedBy: string;
  template: 'general' | 'specialty'; // 通用规则 / 专科规则
  hitCount: number; // 累计命中次数
}

/* ------------------------------ 病案首页 ------------------------------ */

/** 诊断项 */
export interface DiagnosisItem {
  code: string; // ICD-10
  name: string;
  admissionCondition: 'new' | 'complication' | 'comorbidity' | 'no_change'; // 入院病情
  isValid: boolean;
}

/** 手术操作项 */
export interface SurgeryItem {
  code: string; // ICD-9-CM-3
  name: string;
  date: string;
  surgeon: string;
  anesthesia: string;
  incisionGrade: 'I' | 'II' | 'III' | '0';
  healingGrade: '甲' | '乙' | '丙' | '/';
}

/** 编码校验问题 */
export interface CodingIssue {
  field: string;
  issue: string;
  level: DefectLevel;
  suggestion: string;
  aiRecommendedCode?: string;
  aiRecommendedName?: string;
}

/** 逻辑检查问题 */
export interface LogicIssue {
  rule: string;
  message: string;
  level: DefectLevel;
}

/** DRG 分组预测 */
export interface DRGGroup {
  groupCode: string;
  groupName: string;
  weight: number; // 权重
  rw: number; // 相对权重
  estimatedCost: number; // 预估费用（元）
  estimatedLOS: number; // 预估住院日
  actualCost: number;
  actualLOS: number;
  costDeviation: number; // 费用偏差%
  timeDeviation: number; // 时间偏差%
  profitPrediction: 'profit' | 'balance' | 'loss'; // 盈亏
  lowRiskDeath: boolean;
  lowRiskReadmit: boolean;
}

/** 病案首页质控记录 */
export interface FrontPageRecord {
  recordNo: string;
  patientName: string;
  gender: Gender;
  age: number;
  dept: string;
  attendDoctor: string;
  admitDate: string;
  dischargeDate: string;
  los: number; // 住院日
  mainDiagnosis: DiagnosisItem;
  otherDiagnoses: DiagnosisItem[];
  surgeries: SurgeryItem[];
  totalCost: number;
  bedCost: number;
  drugCost: number;
  examCost: number;
  surgeryCost: number;
  codingIssues: CodingIssue[];
  logicIssues: LogicIssue[];
  drg: DRGGroup;
  score: number;
  grade: RecordGrade;
}

/* ------------------------------ 十八项核心制度 ------------------------------ */

/** 制度执行记录 */
export interface SystemExecRecord {
  time: string;
  personnel: string;
  content: string;
}

/** 单项核心制度检查 */
export interface CoreSystemItem {
  key: string; // 制度标识
  name: string; // 制度名称
  status: SystemExecStatus;
  checkPoints: string[]; // 检查要点
  execRecords: SystemExecRecord[];
  issues: string[];
  suggestion: string;
}

/** 核心制度检查结果 */
export interface CoreSystemCheckResult {
  recordNo: string;
  patientName: string;
  dept: string;
  items: CoreSystemItem[];
  execRate: number; // 执行率%
  warningSystems: string[]; // 未执行制度预警
}

/* ------------------------------ 整改任务 ------------------------------ */

/** 整改任务 */
export interface RectificationTask {
  taskId: string;
  recordNo: string;
  patientName: string;
  dept: string;
  doctor: string; // 责任医生
  defectDesc: string;
  defectType: DefectType;
  deduction: number;
  qualityDoctor: string;
  deadline: string;
  status: RectifyStatus;
  rectifyContent?: string;
  rectifyNote?: string;
  rectifyTime?: string;
  reviewResult?: 'approved' | 'rejected';
  reviewNote?: string;
  rectifyScore?: number;
}

/* ------------------------------ 质控统计 ------------------------------ */

/** 科室/医生排名项 */
export interface RankItem {
  name: string;
  total: number;
  passRate: number; // 合格率%
  avgScore: number;
  avgDefects: number;
  rectifyRate: number; // 整改率%
}

/** 缺陷分布项 */
export interface DistItem {
  name: string;
  value: number;
}

/** 质控统计汇总 */
export interface QualityStats {
  pendingToday: number;
  pendingWeek: number;
  pendingMonth: number;
  checkedCount: number;
  passRate: number; // 合格率%
  avgDefects: number;
  pendingRectify: number;
  rectifiedCount: number;
  /** 今日已完成质控数（进度） */
  todayChecked: number;
  todayTarget: number;
  deptRanking: RankItem[];
  doctorRanking: RankItem[];
  recordTypeDist: DistItem[];
  monthlyTrend: { month: string; checked: number; passRate: number }[];
  defectTypeDist: DistItem[];
  defectLevelDist: DistItem[];
  topDefects: { name: string; count: number }[];
  deptDefectHeatmap: { dept: string; type: string; count: number }[];
  rectifyTrend: { month: string; rate: number }[];
  overdueCount: number;
  drgAdmissionRate: number; // 入组率%
  lowRiskDeathRate: number;
}

/* ------------------------------ 规则测试 ------------------------------ */

/** 规则测试结果 */
export interface RuleTestResult {
  triggered: boolean;
  hitFields: string[];
  message: string;
}
