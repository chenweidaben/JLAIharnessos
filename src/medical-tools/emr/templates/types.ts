/**
 * 健澜科技 jlmedaios - EMR 全流程模板种子库共享类型
 *
 * L0 国标模板（scope='national', status='published'）按文书类别拆文件，
 * 本文件定义统一的种子模板形状；四级继承解析见 ../templateResolver.ts。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type {
  TemplateField,
  TemplateFieldType,
  TemplateScope,
  TemplateStatus,
} from '../../../db/repositories/emrTemplateRepo.js';

export type { TemplateField, TemplateFieldType, TemplateScope, TemplateStatus };

/**
 * L0 国标种子模板形状。
 * - scope 固定 'national'、status 固定 'published'；
 * - hospitalId/departmentId/userId 恒为 null（国标层无归属）；
 * - version 为 semver 字符串（'1.0.0'），落库时映射为 DB version int=1；
 * - 同优先级排序按 updatedAt DESC（resolver 保证取最新 published）。
 */
export interface EmrSeedTemplate {
  /** 业务编号，规范命名 TPL-<类别>-<序号> */
  templateId: string;
  /** 中文模板名 */
  name: string;
  /** 文书类型（与 recordType 字典对齐） */
  recordType: string;
  scope: TemplateScope;
  status: TemplateStatus;
  /** 模板正文，含 [占位符]，章节结构按国家规范总表必填章节 */
  content: string;
  /** 结构化字段（控件化，绑定 WS 363 数据元） */
  fields: TemplateField[];
  /** 时限 SLA 表达式，如 admission_time + 8h；无时限为 null */
  dueRule: string | null;
  /** 书写责任角色，如 住院医师/主治医师/麻醉医师/责任护士 */
  responsibleRole: string | null;
  /** 触发事件，如 admission_created / pre_op_24h / post_op */
  triggerEvent: string | null;
  /** semver */
  version: string;
  /** ISO 日期（同优先级排序依据） */
  updatedAt: string;
}

/** 构造 L0 国标种子的小工具，固定 scope/status/version 减少样板。 */
export function national(
  t: Omit<EmrSeedTemplate, 'scope' | 'status' | 'version' | 'updatedAt'> & {
    version?: string;
    updatedAt?: string;
  },
): EmrSeedTemplate {
  return {
    scope: 'national',
    status: 'published',
    version: t.version ?? '1.0.0',
    updatedAt: t.updatedAt ?? '2026-10-01T00:00:00.000Z',
    ...t,
  };
}
