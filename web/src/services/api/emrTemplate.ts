/**
 * 健澜科技 jlmedaios - 电子病历模板 API
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { del, get, post, put } from '../request';

/** 电子病历模板（与 BFF clinical.emr_template 对齐） */
export interface EmrTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

/** 新建模板入参 */
export interface CreateEmrTemplateInput {
  name: string;
  category?: string;
  content?: string;
}

/** 更新模板入参（全部可选） */
export interface UpdateEmrTemplateInput {
  name?: string;
  category?: string;
  content?: string;
}

/** 模板列表（可选按分类筛选）。 */
export function listEmrTemplatesApi(category?: string): Promise<EmrTemplate[]> {
  return get('/emr-template', category ? { category } : undefined);
}

/** 新建模板。 */
export function createEmrTemplateApi(
  input: CreateEmrTemplateInput,
): Promise<EmrTemplate> {
  return post('/emr-template', input);
}

/** 更新模板。 */
export function updateEmrTemplateApi(
  id: string,
  input: UpdateEmrTemplateInput,
): Promise<EmrTemplate> {
  return put(`/emr-template/${id}`, input);
}

/** 删除模板。 */
export function deleteEmrTemplateApi(id: string): Promise<{ deleted: string }> {
  return del(`/emr-template/${id}`);
}
