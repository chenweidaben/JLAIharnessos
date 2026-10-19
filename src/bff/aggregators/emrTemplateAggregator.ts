/**
 * 健澜科技 jlmedaios - 电子病历模板管理聚合器（EMR Template）
 *
 * 提供模板的列表、新建、更新、删除四个视图（listView / createView / updateView /
 * deleteView），直接落 PostgreSQL（clinical.emr_template），去 mock。
 *
 * 安全边界：
 *  - 模板为全院共享资源，读写经 BFF 登录鉴权（auth），不引入独立权限码；
 *  - created_by 由已登录用户注入，不信任客户端传入；
 *  - 输入做最小校验（名称非空），非法入参抛 EmrTemplateError（400）；
 *  - 更新/删除前校验存在性，不存在抛 404。
 *
 * 纯函数（filterTemplatesByCategory / groupTemplatesByCategory）与持久化解耦，
 * 供前端筛选分组逻辑与单元测试复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

// ============================================================================
// 类型与错误
// ============================================================================

/** 电子病历模板（与 clinical.emr_template 表对齐） */
export interface EmrTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

/** 新建入参（id / created_at 由服务端生成） */
export interface NewEmrTemplateInput {
  name: string;
  category?: string;
  content?: string;
}

/** 更新入参（全部可选，仅更新传入字段） */
export interface UpdateEmrTemplateInput {
  name?: string;
  category?: string;
  content?: string;
}

export class EmrTemplateError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EmrTemplateError';
  }
}

const badRequest = (m: string) => new EmrTemplateError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new EmrTemplateError(404, 'NOT_FOUND', m);

function genUuid(): string {
  // 优先使用运行时 crypto，回退到 v4 形态的随机串。
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// 纯函数：分类筛选 / 分组（与持久化解耦，供前端与单测复用）
// ============================================================================

/**
 * 按分类筛选模板。
 * @param templates 模板列表
 * @param category  目标分类；空 / 未传表示“全部”
 */
export function filterTemplatesByCategory(
  templates: EmrTemplate[],
  category?: string | null,
): EmrTemplate[] {
  if (!category) return templates;
  return templates.filter((t) => t.category === category);
}

/**
 * 按分类对模板分组，返回“分类 -> 模板数组”映射，
 * 并附带分类清单（按模板出现顺序去重）。
 */
export function groupTemplatesByCategory(templates: EmrTemplate[]): {
  groups: Record<string, EmrTemplate[]>;
  categories: string[];
} {
  const groups: Record<string, EmrTemplate[]> = {};
  const categories: string[] = [];
  for (const t of templates) {
    const key = t.category || '未分类';
    if (!groups[key]) {
      groups[key] = [];
      categories.push(key);
    }
    groups[key].push(t);
  }
  return { groups, categories };
}

// ============================================================================
// 视图：listView / createView / updateView / deleteView
// ============================================================================

/**
 * 模板列表（按创建时间倒序）。
 * @param category 可选，仅返回该分类下的模板
 */
export async function listView(category?: string | null): Promise<EmrTemplate[]> {
  if (process.env.DEMO_MODE === '1') {
    const demo: EmrTemplate[] = [
      { id: 'demo-emr-1', name: '入院记录模板', category: '住院', content: '主诉：\n现病史：', created_by: null, created_at: '2026-10-01T08:00:00.000Z' },
      { id: 'demo-emr-2', name: '出院小结模板', category: '出院', content: '入院诊断：\n出院诊断：', created_by: null, created_at: '2026-10-03T08:00:00.000Z' },
      { id: 'demo-emr-3', name: '门诊病历模板', category: '门诊', content: '主诉：\n处理意见：', created_by: null, created_at: '2026-10-05T08:00:00.000Z' },
    ];
    return filterTemplatesByCategory(demo, category);
  }
  const db = getDb();
  if (category) {
    return db<EmrTemplate[]>`
      SELECT id, name, category, content, created_by, created_at
      FROM clinical.emr_template
      WHERE category = ${category}
      ORDER BY created_at DESC
    `;
  }
  return db<EmrTemplate[]>`
    SELECT id, name, category, content, created_by, created_at
    FROM clinical.emr_template
    ORDER BY created_at DESC
  `;
}

/**
 * 新建模板。
 * @param actorId 已登录用户 id（created_by）
 */
export async function createView(
  actorId: string | null,
  input: NewEmrTemplateInput,
): Promise<EmrTemplate> {
  const name = (input.name ?? '').trim();
  if (!name) throw badRequest('模板名称不能为空');
  const category = (input.category ?? '未分类').trim() || '未分类';
  const content = input.content ?? '';

  const id = genUuid();
  const db = getDb();
  const rows = await db<EmrTemplate[]>`
    INSERT INTO clinical.emr_template (id, name, category, content, created_by)
    VALUES (${id}, ${name}, ${category}, ${content}, ${actorId})
    RETURNING id, name, category, content, created_by, created_at
  `;
  return rows[0];
}

/**
 * 更新模板（仅更新传入字段）。
 */
export async function updateView(
  id: string,
  input: UpdateEmrTemplateInput,
): Promise<EmrTemplate> {
  if (!id) throw badRequest('模板 id 不能为空');

  const patch: Record<string, string> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest('模板名称不能为空');
    patch.name = name;
  }
  if (input.category !== undefined) {
    patch.category = input.category.trim() || '未分类';
  }
  if (input.content !== undefined) {
    patch.content = input.content;
  }
  if (Object.keys(patch).length === 0) {
    throw badRequest('没有需要更新的字段');
  }

  const db = getDb();
  // 动态 SET 子句：列名均为白名单 key（非用户输入），值统一走参数绑定防注入。
  const cols = Object.keys(patch);
  const assignments = cols
    .map((c, i) => `${c} = $${i + 1}`)
    .join(', ');
  // id 作为最后一个绑定参数（$N）。
  const sql = `
    UPDATE clinical.emr_template
    SET ${assignments}
    WHERE id = $${cols.length + 1}
    RETURNING id, name, category, content, created_by, created_at
  `;
  const rows = (await db.unsafe(sql, [...cols.map((c) => patch[c]), id])) as EmrTemplate[];
  if (rows.length === 0) throw notFound(`模板 ${id} 不存在`);
  return rows[0];
}

/**
 * 删除模板。
 */
export async function deleteView(id: string): Promise<{ deleted: string }> {
  if (!id) throw badRequest('模板 id 不能为空');
  const db = getDb();
  const rows = await db<{ id: string }[]>`
    DELETE FROM clinical.emr_template
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) throw notFound(`模板 ${id} 不存在`);
  return { deleted: id };
}
