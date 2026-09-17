/**
 * 健澜科技数智医院智能体 - security/classification/DataClassificationRules.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 数据分级分类规则
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义医疗数据四级分级分类规则（L1公开/L2内部/L3敏感/L4机密），
 * 依据《数据安全法》《个人信息保护法》及医院数据安全管理制度，
 * 对患者标识信息、医疗健康信息、运营管理信息、公开信息进行分级。
 *
 * @module security/classification/DataClassificationRules
 */

import { DataLevel } from '../types';

/**
 * 单条分类规则
 */
export interface ClassificationRule {
  /** 规则标识 */
  id: string;
  /** 规则名称 */
  name: string;
  /** 命中的数据级别 */
  level: DataLevel;
  /** 字段名匹配（小写后子串匹配） */
  fieldNamePatterns: string[];
  /** 内容匹配正则（对字段值进行内容识别） */
  contentPatterns?: RegExp[];
  /** 所属分类域 */
  category: string;
  /** 规则说明 */
  description: string;
}

/**
 * 数据分级分类规则集
 *
 * 分级原则：
 * - L4 机密：可直接识别自然人身份的核心标识（姓名、身份证、手机号、住址等），
 *   一旦泄露会对个人权益造成严重危害，需严格脱敏与访问控制。
 * - L3 敏感：医疗健康信息（诊断、病历、检验、影像、医嘱等），
 *   属于敏感个人信息，需最小必要授权访问。
 * - L2 内部：医院运营管理信息（费用、排班、质控等），仅限内部使用。
 * - L1 公开：可对外公开信息（科室介绍、医生简介、健康科普等）。
 */
export const DATA_CLASSIFICATION_RULES: ClassificationRule[] = [
  // ===== L4 机密：患者标识信息 =====
  {
    id: 'L4_NAME',
    name: '患者姓名',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['name', 'patientname', 'username', '姓名', '患者姓名', '病人姓名'],
    contentPatterns: [/姓名[：:]\s*[一-龥·]{2,4}/g],
    description: '可直接识别自然人身份的姓名信息',
  },
  {
    id: 'L4_ID_CARD',
    name: '身份证号',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['idcard', 'idno', 'identity', 'sfz', '身份证', '证件号'],
    contentPatterns: [
      /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
    ],
    description: '居民身份证号码',
  },
  {
    id: 'L4_PHONE',
    name: '手机号',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['phone', 'mobile', 'tel', 'contact', '手机', '电话', '联系方式'],
    contentPatterns: [/1[3-9]\d{9}/g],
    description: '手机号码',
  },
  {
    id: 'L4_ADDRESS',
    name: '住址',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['address', 'home', '住址', '户籍', '现住', '联系地址'],
    contentPatterns: [
      /[一-龥]{2,8}(?:省|市|自治区|特别行政区)[一-龥]{0,20}(?:区|县|市|镇|乡|街道|路|街|号|村)/g,
    ],
    description: '详细居住/联系地址',
  },
  {
    id: 'L4_EMAIL',
    name: '电子邮箱',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['email', 'mail', '邮箱', '电子邮件'],
    contentPatterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
    description: '电子邮箱地址',
  },
  {
    id: 'L4_BANK_CARD',
    name: '银行卡号',
    level: DataLevel.L4_CONFIDENTIAL,
    category: '患者标识信息',
    fieldNamePatterns: ['bankcard', 'cardno', 'bank_account', '银行卡', '卡号'],
    contentPatterns: [/\b(?:6[0-9]{15,18}|4[0-9]{15,18}|5[0-9]{15,18}|9[0-9]{15,18})\b/g],
    description: '银行卡号',
  },

  // ===== L3 敏感：医疗健康信息 =====
  {
    id: 'L3_DIAGNOSIS',
    name: '诊断信息',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: ['diagnosis', 'icd', 'diagnose', '诊断', '病种', '主诉', '现病史'],
    description: '疾病诊断与ICD编码',
  },
  {
    id: 'L3_MEDICAL_RECORD',
    name: '病历',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: ['emr', 'medicalrecord', 'recordcontent', '病历', '病程', '病案'],
    description: '电子病历内容',
  },
  {
    id: 'L3_LAB',
    name: '检验结果',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: ['lab', 'labresult', '检验', '化验', '检查结果'],
    description: '检验检查结果',
  },
  {
    id: 'L3_IMAGING',
    name: '影像',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: [
      'imaging',
      'pacs',
      'image',
      '影像',
      '片子',
      'ctimage',
      'ctscan',
      'mriimage',
      'mriscan',
      'xray',
    ],
    description: '医学影像及报告',
  },
  {
    id: 'L3_ORDER',
    name: '医嘱',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: ['order', 'prescription', '医嘱', '处方', '用药'],
    description: '医嘱与处方信息',
  },
  {
    id: 'L3_MEDICAL_RECORD_NO',
    name: '病历号/住院号/门诊号',
    level: DataLevel.L3_SENSITIVE,
    category: '医疗健康信息',
    fieldNamePatterns: [
      'medicalrecordno',
      'inpatientno',
      'outpatientno',
      '病历号',
      '住院号',
      '门诊号',
      '就诊号',
    ],
    description: '院内诊疗流水号',
  },

  // ===== L2 内部：运营管理信息 =====
  {
    id: 'L2_FEE',
    name: '费用信息',
    level: DataLevel.L2_INTERNAL,
    category: '运营管理信息',
    fieldNamePatterns: ['fee', 'cost', 'charge', 'billing', '费用', '金额', '账单', '收费'],
    description: '诊疗费用与账单',
  },
  {
    id: 'L2_SCHEDULE',
    name: '排班信息',
    level: DataLevel.L2_INTERNAL,
    category: '运营管理信息',
    fieldNamePatterns: ['schedule', 'duty', '排班', '值班', '班次'],
    description: '人员排班与值班表',
  },
  {
    id: 'L2_QC',
    name: '质控信息',
    level: DataLevel.L2_INTERNAL,
    category: '运营管理信息',
    fieldNamePatterns: ['qc', 'qualitycontrol', '质控', '考核', '绩效'],
    description: '医疗质量控制与绩效考核',
  },

  // ===== L1 公开 =====
  {
    id: 'L1_DEPT_INTRO',
    name: '科室介绍',
    level: DataLevel.L1_PUBLIC,
    category: '公开信息',
    fieldNamePatterns: ['deptintro', 'departmentintro', '科室介绍', '科室简介'],
    description: '科室公开介绍',
  },
  {
    id: 'L1_DOCTOR_INTRO',
    name: '医生简介',
    level: DataLevel.L1_PUBLIC,
    category: '公开信息',
    fieldNamePatterns: ['doctorintro', 'doctorprofile', '医生简介', '专家介绍'],
    description: '医生公开简介',
  },
  {
    id: 'L1_HEALTH_EDU',
    name: '健康科普',
    level: DataLevel.L1_PUBLIC,
    category: '公开信息',
    fieldNamePatterns: ['healthedu', 'popularscience', '科普', '健康宣教', '健康知识'],
    description: '健康科普内容',
  },
];

/**
 * 数据级别元信息
 */
export const DATA_LEVEL_META: Record<
  DataLevel,
  { name: string; description: string; handling: string }
> = {
  [DataLevel.L1_PUBLIC]: {
    name: '公开级',
    description: '可对外公开的信息',
    handling: '无特殊限制，可公开发布',
  },
  [DataLevel.L2_INTERNAL]: {
    name: '内部级',
    description: '医院内部运营管理信息',
    handling: '仅限内部使用，对外需脱敏',
  },
  [DataLevel.L3_SENSITIVE]: {
    name: '敏感级',
    description: '医疗健康敏感信息',
    handling: '最小必要授权访问，传输/存储加密，操作审计',
  },
  [DataLevel.L4_CONFIDENTIAL]: {
    name: '机密级',
    description: '可识别自然人身份的核心标识',
    handling: '严格脱敏，字段级加密，强访问控制，全程审计',
  },
};
