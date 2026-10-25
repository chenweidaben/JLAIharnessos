/**
 * 健澜科技 jlmedaios - EMR 模板本地兜底目录
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用途：后端 `/api/v1/emr-template` 基础 CRUD 路由未就绪时，
 * `web/src/pages/emr-template-management/index.tsx` 在请求失败 / 异常分支
 * 调用 `getTemplateCatalog()` 取得确定性本地目录，保证页面不白屏、不悬空。
 * 本模块仅承载前端本地降级数据与类型契约，不连接后端、不缓存医疗数据。
 */

export interface MedicalTemplateField {
  key: string;
  label: string;
  required: boolean;
  visibleByDefault: boolean;
}

export type MedicalTemplateLevel = 'general' | 'specialty' | 'ai';
export type MedicalTemplateScenario = 'outpatient' | 'inpatient';

export interface MedicalTemplate {
  templateId: string;
  level: MedicalTemplateLevel;
  specialty?: string;
  scenario: MedicalTemplateScenario;
  minFields: number;
  fields: MedicalTemplateField[];
}

const f = (
  key: string,
  label: string,
  required = true,
  visibleByDefault = true,
): MedicalTemplateField => ({
  key,
  label,
  required,
  visibleByDefault,
});

/**
 * 内置兜底模板目录（顺序固定，仅供本地降级展示与新建/编辑弹窗字段参照）。
 * 字段 key 采用英文标识，label 为中文病历术语；与页面表单 `key:label` 录入格式保持一致。
 */
const LOCAL_TEMPLATE_CATALOG: MedicalTemplate[] = [
  {
    templateId: 'GENERAL_OUTPATIENT',
    level: 'general',
    scenario: 'outpatient',
    minFields: 5,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('pastHistory', '既往史', false),
      f('allergyHistory', '过敏史', false),
      f('physicalExam', '体格检查'),
      f('auxiliaryExam', '辅助检查', false),
      f('preliminaryDiagnosis', '初步诊断'),
      f('treatmentPlan', '处理意见'),
      f('physicianSignature', '医师签名'),
    ],
  },
  {
    templateId: 'GENERAL_INPATIENT',
    level: 'general',
    scenario: 'inpatient',
    minFields: 8,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('pastHistory', '既往史'),
      f('personalHistory', '个人史', false),
      f('familyHistory', '家族史', false),
      f('physicalExam', '体格检查'),
      f('auxiliaryExam', '辅助检查', false),
      f('admissionDiagnosis', '入院诊断'),
      f('treatmentProcess', '诊疗经过'),
      f('dischargeDiagnosis', '出院诊断'),
      f('physicianSignature', '医师签名'),
    ],
  },
  {
    templateId: 'SPECIALTY_CARDIOLOGY_INPATIENT',
    level: 'specialty',
    specialty: '心内科',
    scenario: 'inpatient',
    minFields: 8,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('cardiacHistory', '心血管既往史'),
      f('riskFactors', '危险因素（血压/血脂/血糖/吸烟）', false),
      f('physicalExam', '体格检查（心率/心律/心肺听诊）'),
      f('ecg', '心电图'),
      f('cardiacAuxiliary', '心脏超声 / 心肌酶 / 冠脉影像', false),
      f('admissionDiagnosis', '入院诊断'),
      f('treatmentProcess', '诊疗经过'),
      f('dischargeDiagnosis', '出院诊断'),
      f('physicianSignature', '医师签名'),
    ],
  },
  {
    templateId: 'SPECIALTY_GENERAL_SURGERY_INPATIENT',
    level: 'specialty',
    specialty: '普外科',
    scenario: 'inpatient',
    minFields: 8,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('surgicalHistory', '手术史 / 外伤史', false),
      f('physicalExam', '体格检查（腹部体征）'),
      f('preopAssessment', '术前评估 / 辅助检查', false),
      f('operationRecord', '手术记录要点'),
      f('postopCourse', '术后病程'),
      f('admissionDiagnosis', '入院诊断'),
      f('dischargeDiagnosis', '出院诊断'),
      f('physicianSignature', '医师签名'),
    ],
  },
  {
    templateId: 'AI_GENERAL_OUTPATIENT',
    level: 'ai',
    scenario: 'outpatient',
    minFields: 5,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('physicalExam', '体格检查'),
      f('auxiliaryExam', '辅助检查', false),
      f('aiSuggestion', 'AI 辅助诊断建议', false),
      f('preliminaryDiagnosis', '初步诊断'),
      f('treatmentPlan', '处理意见'),
      f('physicianSignature', '医师签名'),
    ],
  },
  {
    templateId: 'AI_SPECIALTY_INPATIENT',
    level: 'ai',
    specialty: '综合内科',
    scenario: 'inpatient',
    minFields: 6,
    fields: [
      f('chiefComplaint', '主诉'),
      f('presentIllness', '现病史'),
      f('physicalExam', '体格检查'),
      f('auxiliaryExam', '辅助检查', false),
      f('aiRiskFlag', 'AI 风险提示', false),
      f('admissionDiagnosis', '入院诊断'),
      f('treatmentProcess', '诊疗经过'),
      f('dischargeDiagnosis', '出院诊断'),
      f('physicianSignature', '医师签名'),
    ],
  },
];

/**
 * 返回本地兜底模板目录的浅拷贝，避免页面编辑操作污染内置常量。
 */
export function getTemplateCatalog(): MedicalTemplate[] {
  return LOCAL_TEMPLATE_CATALOG.map((t) => ({
    ...t,
    fields: t.fields.map((field) => ({ ...field })),
  }));
}
