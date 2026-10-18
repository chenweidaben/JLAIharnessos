/**
 * 健澜科技 jlmedaios - 病历模板目录（M460 大三甲深度升级）
 *
 * 内置模板：通用住院（12 模块）/ 门诊精简（5 字段）/ 心内科专科 / 普外科专科 / ICU / AI 生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { MedicalTemplate, TemplateField } from './templateTypes';

function f(key: string, label: string, required = true, visibleByDefault = true, icdCode?: string): TemplateField {
  return { key, label, required, visibleByDefault, icdCode };
}

/** 通用住院模板 12 模块字段 */
const GENERAL_INPATIENT_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('presentIllness', '现病史'),
  f('pastHistory', '既往史'),
  f('physicalExam', '体格检查'),
  f('specialtyExam', '专科检查'),
  f('auxiliaryExam', '辅助检查'),
  f('diagnosis', '诊断'),
  f('treatmentPlan', '诊疗计划'),
  f('surgeryRecord', '手术记录'),
  f('dischargeSummary', '出院小结'),
  f('informedConsent', '知情同意'),
  f('signature', '签名'),
];

/** 门诊精简模板 5 字段 */
const OUTPATIENT_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('presentIllness', '现病史'),
  f('physicalExam', '体格检查'),
  f('diagnosis', '诊断'),
  f('treatmentPlan', '诊疗计划'),
];

/** 心内科专科模板 */
const CARDIOLOGY_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('presentIllness', '现病史'),
  f('physicalExam', '体格检查'),
  f('ecg', '心电图'),
  f('cardiacFunction', '心功能评估'),
  f('diagnosis', '诊断'),
  f('treatmentPlan', '诊疗计划'),
];

/** 普外科专科模板 */
const GENERAL_SURGERY_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('presentIllness', '现病史'),
  f('physicalExam', '体格检查'),
  f('abdominalExam', '腹部检查'),
  f('surgeryRecord', '手术记录'),
  f('diagnosis', '诊断'),
  f('treatmentPlan', '诊疗计划'),
];

/** ICU 模板 */
const ICU_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('vitalSigns', '生命体征'),
  f('sepsisAssessment', '脓毒症评估'),
  f('organFunction', '器官功能评估'),
  f('ventilatorSettings', '呼吸机参数'),
  f('sedationScore', '镇静评分'),
  f('treatmentPlan', '诊疗计划'),
];

/** AI 生成模板 */
const AI_GENERATED_FIELDS: TemplateField[] = [
  f('chiefComplaint', '主诉'),
  f('presentIllness', '现病史'),
  f('diagnosis', '诊断'),
  f('treatmentPlan', '诊疗计划'),
];

/**
 * 内置模板目录。
 *
 * @returns 模板数组
 */
export function getTemplateCatalog(): MedicalTemplate[] {
  return [
    {
      templateId: 'GENERAL_INPATIENT',
      level: 'general',
      fields: GENERAL_INPATIENT_FIELDS,
      scenario: 'inpatient',
      minFields: 12,
    },
    {
      templateId: 'OUTPATIENT_LITE',
      level: 'general',
      fields: OUTPATIENT_FIELDS,
      scenario: 'outpatient',
      minFields: 5,
    },
    {
      templateId: 'CARDIOLOGY_INPATIENT',
      level: 'specialty',
      specialty: '心内科',
      fields: CARDIOLOGY_FIELDS,
      scenario: 'inpatient',
      minFields: 7,
    },
    {
      templateId: 'GENERAL_SURGERY_INPATIENT',
      level: 'specialty',
      specialty: '普外科',
      fields: GENERAL_SURGERY_FIELDS,
      scenario: 'inpatient',
      minFields: 7,
    },
    {
      templateId: 'ICU_INPATIENT',
      level: 'specialty',
      specialty: 'ICU',
      fields: ICU_FIELDS,
      scenario: 'inpatient',
      minFields: 7,
    },
    {
      templateId: 'AI_GENERATED',
      level: 'ai',
      fields: AI_GENERATED_FIELDS,
      scenario: 'inpatient',
      minFields: 4,
    },
  ];
}

/**
 * 按场景筛选模板。
 *
 * @param scenario 场景：outpatient / inpatient
 * @returns 模板数组
 */
export function getTemplatesByScenario(scenario: 'outpatient' | 'inpatient'): MedicalTemplate[] {
  return getTemplateCatalog().filter((t) => t.scenario === scenario);
}
