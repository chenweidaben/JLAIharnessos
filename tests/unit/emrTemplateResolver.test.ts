/**
 * 健澜科技 jlmedaios - EMR 四级继承解析器纯函数单测
 *
 * 覆盖：personal 覆盖 national / department 覆盖 hospital / 必填只升不降 /
 * 控件类型锁定 / 同优先级取最新 published / 无上下级回退 national。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import type { ResolverTemplate } from '../../src/medical-tools/emr/templateResolver.js';
import { resolveEffectiveTemplate } from '../../src/medical-tools/emr/templateResolver.js';
import type { TemplateField } from '../../src/db/repositories/emrTemplateRepo.js';

function field(partial: Partial<TemplateField> & { fieldName: string }): TemplateField {
  return {
    fieldType: 'text',
    required: false,
    placeholder: '',
    ...partial,
  };
}

interface Opts {
  templateId: string;
  recordType: string;
  scope: ResolverTemplate['scope'];
  content: string;
  fields: TemplateField[];
  updatedAt?: string;
  hospitalId?: string | null;
  departmentId?: string | null;
  userId?: string | null;
  status?: ResolverTemplate['status'];
}

function t(opts: Opts): ResolverTemplate {
  return {
    templateId: opts.templateId,
    recordType: opts.recordType,
    scope: opts.scope,
    content: opts.content,
    fields: opts.fields,
    status: opts.status ?? 'published',
    updatedAt: opts.updatedAt ?? '2026-10-01T00:00:00.000Z',
    hospitalId: opts.hospitalId ?? null,
    departmentId: opts.departmentId ?? null,
    userId: opts.userId ?? null,
    name: opts.templateId,
    dueRule: null,
    responsibleRole: null,
    triggerEvent: null,
  };
}

const RECORD = '入院记录';

describe('resolveEffectiveTemplate - 覆盖优先级', () => {
  it('personal 覆盖 national（同 recordType 下命中个人级）', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT_CONTENT]',
      fields: [field({ fieldName: 'chiefComplaint', required: true })],
    });
    const personal = t({
      templateId: 'PER',
      recordType: RECORD,
      scope: 'personal',
      content: '[PER_CONTENT]',
      fields: [field({ fieldName: 'chiefComplaint', required: true, placeholder: '个人话术' })],
      userId: 'u-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      userId: 'u-1',
      all: [national, personal],
    });
    expect(eff).not.toBeNull();
    expect(eff!.templateId).toBe('PER');
    expect(eff!.effectiveScope).toBe('personal');
    expect(eff!.content).toBe('[PER_CONTENT]');
  });

  it('department 覆盖 hospital（无 personal 时落到科室级）', () => {
    const hospital = t({
      templateId: 'HOS',
      recordType: RECORD,
      scope: 'hospital',
      content: '[HOS]',
      fields: [field({ fieldName: 'f1', required: false })],
      hospitalId: 'h-1',
    });
    const dept = t({
      templateId: 'DEP',
      recordType: RECORD,
      scope: 'department',
      content: '[DEP]',
      fields: [field({ fieldName: 'f1', required: true, placeholder: '科室加严' })],
      hospitalId: 'h-1',
      departmentId: 'd-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      userId: 'u-x',
      all: [hospital, dept],
    });
    expect(eff!.templateId).toBe('DEP');
    expect(eff!.effectiveScope).toBe('department');
    // 科室级把 f1 从 false 加严为 true（允许）
    expect(eff!.fields.find((f) => f.fieldName === 'f1')!.required).toBe(true);
  });

  it('无 personal/department 时回退 national', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [field({ fieldName: 'chiefComplaint', required: true })],
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      userId: 'u-1',
      all: [national],
    });
    expect(eff!.templateId).toBe('NAT');
    expect(eff!.effectiveScope).toBe('national');
  });

  it('recordType 不匹配返回 null', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [],
    });
    const eff = resolveEffectiveTemplate({
      recordType: '不存在的文书',
      all: [national],
    });
    expect(eff).toBeNull();
  });
});

describe('resolveEffectiveTemplate - 合并规则', () => {
  it('必填只升不降：下级试图把 required:true 改 false 被拒绝，保留 true', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [field({ fieldName: 'dx', required: true, placeholder: '诊断必填' })],
    });
    const personal = t({
      templateId: 'PER',
      recordType: RECORD,
      scope: 'personal',
      content: '[PER]',
      fields: [field({ fieldName: 'dx', required: false })], // 试图放松
      userId: 'u-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      userId: 'u-1',
      all: [national, personal],
    });
    expect(eff!.fields.find((f) => f.fieldName === 'dx')!.required).toBe(true);
    expect(eff!.rejectedOverrides.length).toBeGreaterThan(0);
  });

  it('必填可加严：下级把 required:false 改 true 允许', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [field({ fieldName: 'note', required: false })],
    });
    const dept = t({
      templateId: 'DEP',
      recordType: RECORD,
      scope: 'department',
      content: '[DEP]',
      fields: [field({ fieldName: 'note', required: true })],
      departmentId: 'd-1',
      hospitalId: 'h-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      all: [national, dept],
    });
    expect(eff!.fields.find((f) => f.fieldName === 'note')!.required).toBe(true);
  });

  it('控件类型锁定：下级改 fieldType 被拒绝，保留上级类型', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [field({ fieldName: 'bp', fieldType: 'text', required: true })],
    });
    const personal = t({
      templateId: 'PER',
      recordType: RECORD,
      scope: 'personal',
      content: '[PER]',
      fields: [field({ fieldName: 'bp', fieldType: 'number', required: true })], // 试图改类型
      userId: 'u-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      userId: 'u-1',
      all: [national, personal],
    });
    expect(eff!.fields.find((f) => f.fieldName === 'bp')!.fieldType).toBe('text');
    expect(eff!.rejectedOverrides.join('|')).toContain('fieldType');
  });

  it('下级新增字段允许加入合并结果', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [field({ fieldName: 'a', required: true })],
    });
    const dept = t({
      templateId: 'DEP',
      recordType: RECORD,
      scope: 'department',
      content: '[DEP]',
      fields: [field({ fieldName: 'a', required: true }), field({ fieldName: 'b', required: false })],
      departmentId: 'd-1',
      hospitalId: 'h-1',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      all: [national, dept],
    });
    const names = eff!.fields.map((f) => f.fieldName).sort();
    expect(names).toEqual(['a', 'b']);
  });
});

describe('resolveEffectiveTemplate - 版本选择', () => {
  it('同优先级取最新 published（updatedAt DESC）', () => {
    const old = t({
      templateId: 'DEP-OLD',
      recordType: RECORD,
      scope: 'department',
      content: '[OLD]',
      fields: [],
      departmentId: 'd-1',
      hospitalId: 'h-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const fresh = t({
      templateId: 'DEP-NEW',
      recordType: RECORD,
      scope: 'department',
      content: '[NEW]',
      fields: [],
      departmentId: 'd-1',
      hospitalId: 'h-1',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      all: [old, fresh],
    });
    expect(eff!.templateId).toBe('DEP-NEW');
    expect(eff!.content).toBe('[NEW]');
  });

  it('draft/pending_review 状态不参与解析', () => {
    const national = t({
      templateId: 'NAT',
      recordType: RECORD,
      scope: 'national',
      content: '[NAT]',
      fields: [],
    });
    const draft = t({
      templateId: 'DEP-DRAFT',
      recordType: RECORD,
      scope: 'department',
      content: '[DRAFT]',
      fields: [],
      departmentId: 'd-1',
      hospitalId: 'h-1',
      status: 'draft',
    });
    const eff = resolveEffectiveTemplate({
      recordType: RECORD,
      hospitalId: 'h-1',
      departmentId: 'd-1',
      all: [national, draft],
    });
    expect(eff!.templateId).toBe('NAT');
  });
});
