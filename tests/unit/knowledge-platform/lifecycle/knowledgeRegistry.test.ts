/**
 * 健澜AI原生医院操作系统OS — RAG 知识生命周期基础单元测试（S-11）
 *
 * 覆盖：六域台账登记与过滤、元数据六要素入库拦截、患者标识污染拒绝、状态机合法 / 非法迁移、
 * 生效 / 失效与召回清单过滤、冲突分组与评审记录、季度评审周期、准入留痕检索、历史版本快照
 * 检索与深拷贝隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it } from 'bun:test';

import {
  getKnowledgeLifecycleRegistry,
  KnowledgeLifecycleRegistry,
  validateKnowledgeBaseMeta,
  validateKnowledgeEntry,
  _resetKnowledgeLifecycleRegistry,
  type KnowledgeBaseMeta,
  type KnowledgeDomain,
  type KnowledgeEntry,
} from '@/knowledge-platform/lifecycle/knowledgeRegistry.js';

/** 构造合法知识库台账夹具 */
function makeBase(overrides: Partial<KnowledgeBaseMeta> = {}): KnowledgeBaseMeta {
  return {
    id: 'kb-writing-001',
    domain: 'writing-standard',
    name: '病历书写规范库',
    description: '门诊住院病历书写规范条目台账',
    ownerDepartment: 'medical-affairs',
    owner: '张主任',
    reviewCycleMonths: 3,
    patientScope: 'none',
    tags: ['书写规范'],
    specialty: ['内科'],
    status: 'draft',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    versionRef: 'kb-writing-001@1.0.0',
    changeLog: [],
    reviewHistory: [],
    ...overrides,
  };
}

/** 构造合法知识条目夹具 */
function makeEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: 'ke-writing-001',
    knowledgeBaseId: 'kb-writing-001',
    title: '主诉书写要求',
    sectionTitle: '第一章 基本要求',
    specialty: ['内科'],
    securityLevel: 'internal',
    owner: '李医师',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    origin: {
      sourceId: 'std-writing-2026',
      sourceName: '病历书写规范 2026 版',
      publisher: '医务部',
      fetchedAt: '2026-09-20T00:00:00.000Z',
    },
    versionRef: 'ke-writing-001@1.0.0',
    content: '主诉应简明扼要，简述主要症状与持续时间。',
    status: 'draft',
    changeLog: [],
    reviewHistory: [],
    patientScope: 'none',
    ...overrides,
  };
}

const ALL_DOMAINS: KnowledgeDomain[] = [
  'writing-standard',
  'clinical-guide',
  'hospital-policy',
  'specialty',
  'data-standard',
  'operations-faq',
];

beforeEach(() => {
  _resetKnowledgeLifecycleRegistry();
});

// ============================================================================
// 六域台账登记与过滤
// ============================================================================

describe('KnowledgeLifecycleRegistry - 六域台账', () => {
  it('六类 domain 各登记一条可按 id 回读', () => {
    const registry = new KnowledgeLifecycleRegistry();
    ALL_DOMAINS.forEach((domain, index) => {
      const base = registry.registerBase(makeBase({ id: `kb-${index}`, domain, name: `台账-${domain}` }));
      expect(base.id).toBe(`kb-${index}`);
      expect(base.domain).toBe(domain);
    });
    expect(registry.getBase('kb-0')?.domain).toBe('writing-standard');
    expect(registry.getBase('kb-5')?.domain).toBe('operations-faq');
  });

  it('非法 domain 拒绝登记', () => {
    const registry = new KnowledgeLifecycleRegistry();
    expect(() =>
      registry.registerBase(makeBase({ domain: 'unknown-domain' as KnowledgeDomain })),
    ).toThrow(/KB-001/);
  });

  it('重复 id 在知识库与条目命名空间内均拒绝', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    expect(() => registry.registerBase(makeBase({ name: '重复台账' }))).toThrow(/KB-002/);

    registry.registerEntry(makeEntry({ id: 'ke-002' }));
    expect(() => registry.registerEntry(makeEntry({ id: 'ke-002' }))).toThrow(/KB-002/);
  });

  it('召回清单按 domain / specialty / securityLevel / ownerDepartment / knowledgeBaseId 精确过滤', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase({ id: 'kb-a', specialty: ['内科', '外科'], ownerDepartment: 'medical-affairs' }));
    registry.registerBase(makeBase({ id: 'kb-b', domain: 'clinical-guide', specialty: ['儿科'], ownerDepartment: 'pediatrics' }));
    registry.registerEntry(
      makeEntry({
        id: 'ke-a1',
        knowledgeBaseId: 'kb-a',
        specialty: ['内科'],
        securityLevel: 'internal',
        effectiveDate: '2026-10-01T00:00:00.000Z',
      }),
    );
    registry.registerEntry(
      makeEntry({
        id: 'ke-a2',
        knowledgeBaseId: 'kb-a',
        specialty: ['外科'],
        securityLevel: 'confidential',
        effectiveDate: '2026-10-01T00:00:00.000Z',
      }),
    );
    registry.registerEntry(
      makeEntry({
        id: 'ke-b1',
        knowledgeBaseId: 'kb-b',
        specialty: ['儿科'],
        securityLevel: 'public',
        effectiveDate: '2026-10-01T00:00:00.000Z',
      }),
    );
    // 三条均未审批，不在召回清单
    expect(registry.listActiveForRetrieval()).toHaveLength(0);

    for (const id of ['ke-a1', 'ke-a2', 'ke-b1']) {
      registry.submitForReview(id, '李医师', '内科规范适用范围', '门诊病历书写辅助');
      registry.approve(id, '王主任');
    }

    expect(registry.listActiveForRetrieval({ domain: 'writing-standard' })).toHaveLength(2);
    expect(registry.listActiveForRetrieval({ specialty: '儿科' })).toHaveLength(1);
    expect(registry.listActiveForRetrieval({ securityLevel: 'confidential' })).toHaveLength(1);
    expect(registry.listActiveForRetrieval({ ownerDepartment: 'pediatrics' })).toHaveLength(1);
    expect(registry.listActiveForRetrieval({ knowledgeBaseId: 'kb-a' })).toHaveLength(2);
    expect(registry.listActiveForRetrieval({ domain: 'operations-faq' })).toEqual([]);
  });
});

// ============================================================================
// 元数据六要素入库拦截
// ============================================================================

describe('KnowledgeLifecycleRegistry - 六要素拦截', () => {
  it('来源缺失（sourceId / sourceName / fetchedAt）分别拒绝，错误信息含要素名', () => {
    expect(validateKnowledgeEntry(makeEntry({ origin: { ...makeEntry().origin, sourceId: '' } })).some((e) => e.includes('sourceId'))).toBe(true);
    expect(validateKnowledgeEntry(makeEntry({ origin: { ...makeEntry().origin, sourceName: '' } })).some((e) => e.includes('sourceName'))).toBe(true);
    expect(validateKnowledgeEntry(makeEntry({ origin: { ...makeEntry().origin, fetchedAt: '' } })).some((e) => e.includes('fetchedAt'))).toBe(true);
  });

  it('章节缺失、生效日期缺失、专科为空、密级非法分别拒绝', () => {
    expect(validateKnowledgeEntry(makeEntry({ sectionTitle: '' })).some((e) => e.includes('sectionTitle'))).toBe(true);
    expect(validateKnowledgeEntry(makeEntry({ effectiveDate: '' })).some((e) => e.includes('effectiveDate'))).toBe(true);
    expect(validateKnowledgeEntry(makeEntry({ specialty: [] })).some((e) => e.includes('specialty'))).toBe(true);
    expect(validateKnowledgeEntry(makeEntry({ securityLevel: 'ultra' as never })).some((e) => e.includes('securityLevel'))).toBe(true);
  });

  it('机构缺失：origin.publisher 与知识库 ownerDepartment 均为空时拒绝', () => {
    const noPublisher = makeEntry({ origin: { sourceId: 's1', sourceName: '来源一', fetchedAt: '2026-09-20T00:00:00.000Z' } });
    expect(validateKnowledgeEntry(noPublisher, undefined).some((e) => e.includes('机构'))).toBe(true);
    // 知识库 ownerDepartment 兜底机构要素可通过校验
    expect(validateKnowledgeEntry(noPublisher, 'medical-affairs')).toEqual([]);
  });

  it('患者标识字段携带即拒绝；patientScope 非 none 拒绝', () => {
    const tainted = makeEntry({ patientScope: 'none' }) as unknown as Record<string, unknown>;
    tainted.patientId = 'P-10001';
    const registry = new KnowledgeLifecycleRegistry();
    expect(() => registry.registerEntry(tainted as unknown as KnowledgeEntry)).toThrow(/KB-005/);

    expect(validateKnowledgeEntry({ ...makeEntry(), patientScope: 'patient-isolated' } as unknown as KnowledgeEntry).some((e) => e.includes('patientScope'))).toBe(true);
  });

  it('登记端到端抛 KB-004 且不写入台账', () => {
    const registry = new KnowledgeLifecycleRegistry();
    expect(() => registry.registerEntry(makeEntry({ sectionTitle: '' }))).toThrow(/KB-004/);
    expect(registry.getEntry('ke-writing-001')).toBeUndefined();
  });

  it('知识库台账必填 / 专科 / 评审周期校验', () => {
    expect(validateKnowledgeBaseMeta(makeBase({ id: '' })).some((e) => e.includes('id'))).toBe(true);
    expect(validateKnowledgeBaseMeta(makeBase({ ownerDepartment: '' })).some((e) => e.includes('ownerDepartment'))).toBe(true);
    expect(validateKnowledgeBaseMeta(makeBase({ specialty: [] })).some((e) => e.includes('specialty'))).toBe(true);
    expect(validateKnowledgeBaseMeta(makeBase({ reviewCycleMonths: 0 })).some((e) => e.includes('reviewCycleMonths'))).toBe(true);
  });
});

// ============================================================================
// 状态机
// ============================================================================

describe('KnowledgeLifecycleRegistry - 状态机', () => {
  it('合法迁移：draft → pending_review → approved；approve 写 approver/approvedAt 与变更记录', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry());
    registry.submitForReview('ke-writing-001', '李医师', '适用门诊病历书写场景', '病历辅助撰写');
    expect(registry.getEntry('ke-writing-001')?.status).toBe('pending_review');

    registry.approve('ke-writing-001', '王主任');
    const entry = registry.getEntry('ke-writing-001');
    expect(entry?.status).toBe('approved');
    expect(entry?.approver).toBe('王主任');
    expect(entry?.approvedAt).toBeTruthy();
    expect(entry?.changeLog.some((c) => c.reviewResult === 'approved')).toBe(true);
  });

  it('退回修订：pending_review → draft，变更记录标注 rejected', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerEntry(makeEntry());
    registry.submitForReview('ke-writing-001', '李医师', '适用范围待补充', '病历辅助撰写');
    registry.reject('ke-writing-001', '王主任', '章节要素不全，请补充出处');
    const entry = registry.getEntry('ke-writing-001');
    expect(entry?.status).toBe('draft');
    expect(entry?.changeLog.some((c) => c.reviewResult === 'rejected')).toBe(true);
  });

  it('非法迁移抛 KB-003 且含合法出边提示；终态不可再迁', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerEntry(makeEntry());
    // draft 不可直接 approve
    expect(() => registry.approve('ke-writing-001', '王主任')).toThrow(/KB-003/);

    registry.submitForReview('ke-writing-001', '李医师', '适用范围', '用途');
    registry.approve('ke-writing-001', '王主任');
    // approved → deprecated 合法
    registry.deprecate('ke-writing-001', '管理员', '规范版本废止');
    expect(registry.getEntry('ke-writing-001')?.status).toBe('deprecated');
    // deprecated 终态：再 approve / deprecate 均拒绝
    expect(() => registry.approve('ke-writing-001', '王主任')).toThrow(/KB-003/);
    expect(() => registry.deprecate('ke-writing-001', '管理员', '二次停用')).toThrow(/KB-003/);
  });

  it('supersede 新旧版本链双向可溯：旧版本 supersededBy 指新版本，新版本 parentVersionRef 指旧版本', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry());
    registry.submitForReview('ke-writing-001', '李医师', '适用范围', '用途');
    registry.approve('ke-writing-001', '王主任');

    const fresh = makeEntry({
      id: 'ke-writing-002',
      versionRef: 'ke-writing-002@2.0.0',
      title: '主诉书写要求（2026 修订）',
    });
    const next = registry.supersede('ke-writing-001', fresh, '管理员');
    expect(next.changeLog[0].parentVersionRef).toBe('ke-writing-001@1.0.0');

    const old = registry.getEntry('ke-writing-001');
    expect(old?.status).toBe('superseded');
    expect(old?.supersededBy).toBe('ke-writing-002');
    expect(old?.changeLog.some((c) => c.parentVersionRef === 'ke-writing-002@2.0.0')).toBe(true);
  });
});

// ============================================================================
// 生效 / 失效与召回清单
// ============================================================================

describe('KnowledgeLifecycleRegistry - 生效失效与召回', () => {
  it('未生效条目（effectiveDate 在未来）不在召回清单', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry({ effectiveDate: '2099-01-01T00:00:00.000Z' }));
    registry.submitForReview('ke-writing-001', '李医师', '适用范围', '用途');
    registry.approve('ke-writing-001', '王主任');
    expect(registry.listActiveForRetrieval()).toEqual([]);
  });

  it('到期条目经 scanExpired 转 expired，且不在召回清单', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(
      makeEntry({
        effectiveDate: '2026-01-01T00:00:00.000Z',
        expireDate: '2026-10-01T00:00:00.000Z',
      }),
    );
    registry.submitForReview('ke-writing-001', '李医师', '适用范围', '用途');
    registry.approve('ke-writing-001', '王主任');

    const expired = registry.scanExpired(new Date('2026-10-26T00:00:00.000Z'));
    expect(expired).toHaveLength(1);
    expect(registry.getEntry('ke-writing-001')?.status).toBe('expired');
    expect(registry.listActiveForRetrieval()).toEqual([]);
  });

  it('superseded / deprecated 条目不在召回清单；无匹配返回空数组', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry({ id: 'ke-old' }));
    registry.registerEntry(makeEntry({ id: 'ke-deprecated' }));
    for (const id of ['ke-old', 'ke-deprecated']) {
      registry.submitForReview(id, '李医师', '适用范围', '用途');
      registry.approve(id, '王主任');
    }
    registry.supersede('ke-old', makeEntry({ id: 'ke-new', versionRef: 'ke-new@2.0.0' }), '管理员');
    registry.deprecate('ke-deprecated', '管理员', '停用');
    expect(registry.listActiveForRetrieval()).toEqual([]);
    expect(registry.listActiveForRetrieval({ domain: 'specialty' })).toEqual([]);
  });

  it('isActive 口径：approved + 已生效 + 未到期', () => {
    const registry = new KnowledgeLifecycleRegistry();
    const active = makeEntry({ effectiveDate: '2026-01-01T00:00:00.000Z' });
    expect(registry.isActive(active, new Date('2026-10-26T00:00:00.000Z'))).toBe(false);
    active.status = 'approved';
    expect(registry.isActive(active, new Date('2026-10-26T00:00:00.000Z'))).toBe(true);
    active.expireDate = '2026-10-01T00:00:00.000Z';
    expect(registry.isActive(active, new Date('2026-10-26T00:00:00.000Z'))).toBe(false);
  });
});

// ============================================================================
// 冲突分组
// ============================================================================

describe('KnowledgeLifecycleRegistry - 冲突分组', () => {
  it('同组多条 approved 条目进入 listConflictGroup；flagConflict 评审结论写入 reviewHistory', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(
      makeEntry({ id: 'ke-c1', conflictGroup: 'bp-pressure-target', title: '血压控制目标 A 来源' }),
    );
    registry.registerEntry(
      makeEntry({ id: 'ke-c2', conflictGroup: 'bp-pressure-target', title: '血压控制目标 B 来源' }),
    );
    for (const id of ['ke-c1', 'ke-c2']) {
      registry.submitForReview(id, '李医师', '适用范围', '用途');
      registry.approve(id, '王主任');
    }

    const group = registry.listConflictGroup('bp-pressure-target');
    expect(group).toHaveLength(2);

    registry.flagConflict('bp-pressure-target', '质控员', '两份指南目标值不一致，待人工确认保留或融合');
    for (const id of ['ke-c1', 'ke-c2']) {
      const history = registry.getEntry(id)?.reviewHistory;
      expect(history?.some((h) => h.conclusion === 'revise' && h.evidenceRef === 'bp-pressure-target')).toBe(true);
    }
  });
});

// ============================================================================
// 评审周期
// ============================================================================

describe('KnowledgeLifecycleRegistry - 季度评审', () => {
  it('approve 后 reviewDueAt 按 3 个月推算；listReviewDue 命中到期台账', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.submitForReview('kb-writing-001', '张主任', '科室制度台账', '内部制度检索');
    registry.approve('kb-writing-001', '分管院长');

    const base = registry.getBase('kb-writing-001');
    expect(base?.reviewCycleMonths).toBe(3);
    expect(base?.reviewDueAt).toBeTruthy();
    expect(registry.listReviewDue(new Date('2026-10-26T00:00:00.000Z'))).toEqual([]);
    expect(registry.listReviewDue(new Date('2027-02-01T00:00:00.000Z'))).toHaveLength(1);
  });

  it('recordReview 三结论：continue 顺延、revise 退回 draft、retire 转 deprecated', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.submitForReview('kb-writing-001', '张主任', '适用范围', '用途');
    registry.approve('kb-writing-001', '分管院长');

    // continue：顺延评审到期日
    const before = registry.getBase('kb-writing-001')?.reviewDueAt;
    registry.recordReview('kb-writing-001', {
      reviewedAt: '2027-01-15T00:00:00.000Z',
      reviewer: '质控员',
      conclusion: 'continue',
      note: '继续有效',
    });
    expect(registry.getBase('kb-writing-001')?.reviewDueAt).not.toBe(before);

    // revise：approved → draft 退回修订
    registry.recordReview('kb-writing-001', {
      reviewedAt: '2027-02-15T00:00:00.000Z',
      reviewer: '质控员',
      conclusion: 'revise',
      note: '条款需修订',
    });
    expect(registry.getBase('kb-writing-001')?.status).toBe('draft');

    // 修订后重新提交初审、审批，retire → deprecated
    registry.submitForReview('kb-writing-001', '张主任', '修订后提交', '用途');
    registry.approve('kb-writing-001', '分管院长');
    registry.recordReview('kb-writing-001', {
      reviewedAt: '2027-05-15T00:00:00.000Z',
      reviewer: '质控员',
      conclusion: 'retire',
      note: '制度废止',
    });
    expect(registry.getBase('kb-writing-001')?.status).toBe('deprecated');
  });
});

// ============================================================================
// 准入留痕
// ============================================================================

describe('KnowledgeLifecycleRegistry - 准入留痕', () => {
  it('提交人 / 审批人 / 适用范围 / 密级 / 用途可按审批人 / 时间窗 / 域检索；未审批条目 approver 为空', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase({ id: 'kb-a' }));
    registry.registerEntry(makeEntry({ id: 'ke-a1', knowledgeBaseId: 'kb-a' }));

    registry.submitForReview('ke-a1', '李医师', '门诊内科规范适用范围', '病历辅助撰写');
    registry.approve('ke-a1', '王主任');
    registry.submitForReview('kb-a', '张主任', '科室制度台账', '内部制度检索');

    const trail = registry.listAdmissionTrail();
    expect(trail).toHaveLength(2);
    expect(trail.find((t) => t.id === 'ke-a1')?.submittedBy).toBe('李医师');
    expect(trail.find((t) => t.id === 'ke-a1')?.approver).toBe('王主任');
    expect(trail.find((t) => t.id === 'ke-a1')?.scopeSummary).toBe('门诊内科规范适用范围');
    expect(trail.find((t) => t.id === 'ke-a1')?.intendedUse).toBe('病历辅助撰写');
    expect(trail.find((t) => t.id === 'kb-a')?.approver).toBeUndefined();

    expect(registry.listAdmissionTrail({ approver: '王主任' })).toHaveLength(1);
    expect(registry.listAdmissionTrail({ domain: 'writing-standard' })).toHaveLength(2);
    expect(
      registry.listAdmissionTrail({ from: '2000-01-01T00:00:00.000Z', to: '2099-01-01T00:00:00.000Z' }),
    ).toHaveLength(2);
    expect(registry.listAdmissionTrail({ from: '2000-01-01T00:00:00.000Z', to: '2000-01-02T00:00:00.000Z' })).toEqual([]);
  });
});

// ============================================================================
// 版本快照与深拷贝隔离
// ============================================================================

describe('KnowledgeLifecycleRegistry - 版本快照与深拷贝隔离', () => {
  it('被替代历史条目可按 versionRef 检索，且不出现在 active 召回清单', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry());
    registry.submitForReview('ke-writing-001', '李医师', '适用范围', '用途');
    registry.approve('ke-writing-001', '王主任');
    registry.supersede(
      'ke-writing-001',
      makeEntry({ id: 'ke-writing-002', versionRef: 'ke-writing-002@2.0.0' }),
      '管理员',
    );

    const historical = registry.getEntryByVersion('ke-writing-001@1.0.0');
    expect(historical?.status).toBe('superseded');
    expect(registry.getEntryByVersion('ke-missing@9.9.9')).toBeUndefined();
    expect(registry.listActiveForRetrieval()).toEqual([]);
  });

  it('返回对象为深拷贝，外部修改不影响台账内部状态', () => {
    const registry = new KnowledgeLifecycleRegistry();
    registry.registerBase(makeBase());
    registry.registerEntry(makeEntry());

    const cloned = registry.getEntry('ke-writing-001');
    if (cloned) {
      cloned.title = '外部篡改标题';
      cloned.specialty.push('外科');
    }
    const stored = registry.getEntry('ke-writing-001');
    expect(stored?.title).toBe('主诉书写要求');
    expect(stored?.specialty).toEqual(['内科']);
  });
});
