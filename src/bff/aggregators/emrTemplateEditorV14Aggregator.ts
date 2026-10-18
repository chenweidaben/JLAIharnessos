/**
 * 健澜科技 jlmedaios - 病历模板可视化编辑器 V14 聚合器（M465-A）
 *
 * 纯函数：校验模板布局合法性 + 生成预览摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 模板字段 */
export interface TemplateFieldV14 {
  key: string;
  label: string;
  visible: boolean;
}

/** 模板区域 */
export interface TemplateSectionV14 {
  name: string;
  fields: TemplateFieldV14[];
}

/** 模板布局 */
export interface TemplateLayoutV14 {
  templateId: string;
  sections: TemplateSectionV14[];
}

/** 校验结果 */
export interface LayoutValidationV14 {
  valid: boolean;
  errors: string[];
}

/** 预览摘要 */
export interface TemplatePreviewV14 {
  sections: string[];
  fieldCount: number;
}

/**
 * 校验模板布局合法性。
 *
 * @param layout 模板布局
 * @returns valid + errors 列表
 */
export function validateTemplateLayout(layout: TemplateLayoutV14): LayoutValidationV14 {
  const errors: string[] = [];
  if (!layout.sections || layout.sections.length === 0) {
    errors.push("至少需要 1 个区域");
  }
  for (const section of layout.sections ?? []) {
    if (!section.fields || section.fields.length === 0) {
      errors.push(`区域"${section.name}"至少需要 1 个字段`);
    }
    for (const field of section.fields ?? []) {
      if (!field.label || field.label.trim() === "") {
        errors.push(`字段"${field.key}"的 label 不能为空`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 生成模板预览摘要。
 *
 * @param layout 模板布局
 * @returns sections 名列表 + fieldCount 总字段数
 */
export function buildTemplatePreview(layout: TemplateLayoutV14): TemplatePreviewV14 {
  const sections = (layout.sections ?? []).map((s) => s.name);
  let fieldCount = 0;
  for (const section of layout.sections ?? []) {
    fieldCount += (section.fields ?? []).length;
  }
  return { sections, fieldCount };
}
