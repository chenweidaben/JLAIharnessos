/**
 * 健澜科技 jlmedaios - EMR 四级模板继承解析器（纯函数，不触库）
 *
 * L0 国标 → L1 院级 → L2 科室级 → L3 个人级 继承覆盖。
 *
 * 规则（对齐研究报告第 4 章）：
 *  - 覆盖优先级：personal > department > hospital > national；
 *  - 同优先级取最新 published（updatedAt DESC）；
 *  - 必填只升不降：下级只能把 required:false 改为 true，不能把 true 改回 false（合规红线）；
 *  - 控件类型锁定：下级不得改 fieldType（保证数据元可机器读取）；
 *  - content：取最高命中层级的整段正文（个人/科室覆盖即整段替换，未命中层级不回退段落）；
 *  - fields：自底向上逐层合并，新字段可加严必填/改默认提示，不能放松上级必填。
 *
 * 纯函数：不触库、不做 I/O、可单测。DB 真源由 emrTemplateRepo 取数后注入 all 参数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { TemplateField, TemplateScope, TemplateStatus } from '../../db/repositories/emrTemplateRepo.js';

/** 解析器输入：种子层（EmrSeedTemplate）与 DB 行（EmrTemplate）都满足此形状。 */
export interface ResolverTemplate {
  templateId: string;
  recordType: string;
  scope: TemplateScope;
  hospitalId?: string | null;
  departmentId?: string | null;
  userId?: string | null;
  content: string;
  fields: TemplateField[];
  status: TemplateStatus;
  updatedAt: string;
  name?: string;
  dueRule?: string | null;
  responsibleRole?: string | null;
  triggerEvent?: string | null;
}

export interface ResolveOpts {
  recordType: string;
  hospitalId?: string | null;
  departmentId?: string | null;
  userId?: string | null;
  /** 候选全集（已由调用方取数：DB 行 + L0 种子合并后注入） */
  all: ResolverTemplate[];
}

export interface EffectiveTemplate {
  templateId: string;
  name: string;
  recordType: string;
  /** 实际命中的层级（personal/department/hospital/national） */
  effectiveScope: TemplateScope;
  content: string;
  fields: TemplateField[];
  dueRule: string | null;
  responsibleRole: string | null;
  triggerEvent: string | null;
  updatedAt: string;
  /** 被拒绝的覆盖记录（调试/审计用：required 放松、fieldType 变更） */
  rejectedOverrides: string[];
}

const SCOPE_PRIORITY: ReadonlyArray<TemplateScope> = ['personal', 'department', 'hospital', 'national'];

/**
 * 判断某条模板在给定上下文中是否归属该层级。
 * - personal 要求 userId 匹配；department 要求 departmentId 匹配；
 *   hospital 要求 hospitalId 匹配；national 不要求归属。
 */
function matchesOwner(t: ResolverTemplate, scope: TemplateScope, opts: ResolveOpts): boolean {
  switch (scope) {
    case 'personal':
      return !!opts.userId && t.userId != null && t.userId === opts.userId;
    case 'department':
      return !!opts.departmentId && t.departmentId != null && t.departmentId === opts.departmentId;
    case 'hospital':
      return !!opts.hospitalId && t.hospitalId != null && t.hospitalId === opts.hospitalId;
    case 'national':
      return true;
  }
}

/** 同层级内取最新 published（updatedAt DESC；时间相同则 templateId 字典序兜底稳定）。 */
function pickLatest(candidates: ResolverTemplate[]): ResolverTemplate {
  return [...candidates].sort((a, b) => {
    if (a.updatedAt === b.updatedAt) return a.templateId < b.templateId ? -1 : 1;
    return a.updatedAt > b.updatedAt ? -1 : 1;
  })[0];
}

/**
 * 字段合并：自底向上（national → hospital → department → personal）叠加。
 * - 新增字段直接加入；
 * - 同名字段 fieldType 必须一致，否则跳过下级覆盖（控件类型锁定）；
 * - required 只升不降：上级 required=true 时下级不得改 false；
 * - placeholder/options 由下级覆盖。
 */
function mergeFields(layers: ResolverTemplate[]): { fields: TemplateField[]; rejected: string[] } {
  const merged = new Map<string, TemplateField>();
  const rejected: string[] = [];
  for (const layer of layers) {
    for (const f of layer.fields) {
      const existing = merged.get(f.fieldName);
      if (!existing) {
        merged.set(f.fieldName, { ...f });
        continue;
      }
      if (existing.fieldType !== f.fieldType) {
        rejected.push(
          `${layer.templateId}: 字段 ${f.fieldName} 试图把 fieldType 从 ${existing.fieldType} 改为 ${f.fieldType}，已拒绝`,
        );
        continue;
      }
      // 必填只升不降：上级已 required=true，下级不可放松
      const required = existing.required ? true : f.required;
      if (existing.required && !f.required) {
        rejected.push(
          `${layer.templateId}: 字段 ${f.fieldName} 试图放松 required=true→false，已拒绝`,
        );
      }
      merged.set(f.fieldName, {
        ...existing,
        ...f,
        required,
      });
    }
  }
  return { fields: [...merged.values()], rejected };
}

/**
 * 解析最终生效模板。
 * 无任何 published 命中返回 null；命中某层级后自底向上合并 fields。
 */
export function resolveEffectiveTemplate(opts: ResolveOpts): EffectiveTemplate | null {
  const published = opts.all.filter(
    (t) => t.recordType === opts.recordType && t.status === 'published',
  );
  if (published.length === 0) return null;

  // 1) 找最高命中层级
  let winner: ResolverTemplate | null = null;
  let winnerScope: TemplateScope | null = null;
  for (const scope of SCOPE_PRIORITY) {
    const candidates = published.filter((t) => t.scope === scope && matchesOwner(t, scope, opts));
    if (candidates.length > 0) {
      winner = pickLatest(candidates);
      winnerScope = scope;
      break;
    }
  }
  if (!winner || !winnerScope) return null;

  // 2) 自底向上收集参与合并的层级（national → ... → winner）
  const layers: ResolverTemplate[] = [];
  for (const scope of SCOPE_PRIORITY.slice().reverse()) {
    const layerCandidates = published
      .filter((t) => t.scope === scope && matchesOwner(t, scope, opts))
      .sort((a, b) => (a.updatedAt === b.updatedAt ? 0 : a.updatedAt > b.updatedAt ? -1 : 1));
    const layerLatest = layerCandidates[0];
    if (layerLatest) layers.push(layerLatest);
    if (scope === winnerScope) break;
  }

  const { fields, rejected } = mergeFields(layers);

  return {
    templateId: winner.templateId,
    name: winner.name ?? winner.templateId,
    recordType: winner.recordType,
    effectiveScope: winnerScope,
    content: winner.content,
    fields,
    dueRule: winner.dueRule ?? null,
    responsibleRole: winner.responsibleRole ?? null,
    triggerEvent: winner.triggerEvent ?? null,
    updatedAt: winner.updatedAt,
    rejectedOverrides: rejected,
  };
}
