/**
 * 健澜科技 jlmedaios - 病历模板体系数据结构（M460 大三甲深度升级）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 模板层级：通用 / 专科 / AI 生成 */
export type TemplateLevel = 'general' | 'specialty' | 'ai';

/** 模板适用场景：门诊 / 住院 */
export type TemplateScenario = 'outpatient' | 'inpatient';

/** 模板字段定义 */
export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  visibleByDefault: boolean;
  icdCode?: string;
}

/** 病历模板定义 */
export interface MedicalTemplate {
  templateId: string;
  level: TemplateLevel;
  specialty?: string;
  fields: TemplateField[];
  scenario: TemplateScenario;
  minFields: number;
}
