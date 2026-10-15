/**
 * 健澜科技 jlmedaios - agent 学习上下文聚合（依据宪法第三章）纯函数单测
 *
 * 覆盖：
 *  - 上下文聚合：三路全量时抬头 + 三段齐备，顺序为 患者画像 > 医生偏好 > 科室知识；
 *  - 空数据兜底：三路全 null / 空结构时返回冷启动兜底文案，不抛错；
 *  - 优先级排序 priorityOrder：priority 降序、空段沉底、不改入参；
 *  - 患者数据脱敏：patientId 等直接标识符不进入上下文文本。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildAgentContext,
  priorityOrder,
  CONTEXT_PRIORITY,
  type AgentContextSection,
} from '../../src/bff/aggregators/agentContextAggregator';
import type { DoctorPreference } from '../../src/bff/aggregators/doctorPreferenceAggregator';
import type { PatientProfile } from '../../src/bff/aggregators/patientProfileAggregator';
import type { DeptKnowledgeEntry } from '../../src/bff/aggregators/deptKnowledgeAggregator';

/** 构造患者画像（patientId 为院内脱敏主键，断言其不出现在输出中） */
function patientProfile(overrides: Partial<PatientProfile> = {}): PatientProfile {
  return {
    patientId: 'P-9527',
    chronicConditions: ['高血压', '2型糖尿病'],
    drugReactions: ['盐酸二甲双胍缓释片（恶心）'],
    preferredTreatment: '近6个月就诊4次，以心血管内科为主（3次）；医嘱以长期医嘱为主。',
    recentVisitsSummary:
      '近12个月共就诊4次：心血管内科3次、内分泌科1次；最近一次为2026-10-08心血管内科门诊，主诉胸闷3天。',
    riskFlags: ['单慢病随访管理', '近6个月就诊频繁（≥3次），需关注病情波动'],
    updatedAt: '2026-10-08T08:00:00.000Z',
    ...overrides,
  };
}

/** 构造医生偏好 */
function doctorPref(): DoctorPreference {
  return {
    preferredDrugs: [
      { name: '苯磺酸氨氯地平片', count: 12 },
      { name: '阿托伐他汀钙片', count: 8 },
    ],
    preferredExams: [{ name: '血常规(五分类)', count: 6, category: '检验' }],
    commonPathways: [{ name: '高血压门诊路径', count: 9 }],
  };
}

/** 构造科室知识条目 */
function deptEntries(): DeptKnowledgeEntry[] {
  return [
    {
      id: 'k1',
      deptCode: 'cardiology',
      knowledgeType: 'pathway',
      title: '社区获得性肺炎路径',
      content: 'CAP 经验性抗感染 + 48~72h 复评，退热平稳后序贯口服。',
      source: 'system',
      usageCount: 128,
      successRate: 0.92,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
}

describe('buildAgentContext 上下文聚合', () => {
  it('三路全量时输出抬头 + 三段，且段顺序为 患者画像 > 医生偏好 > 科室知识', () => {
    const text = buildAgentContext(doctorPref(), patientProfile(), deptEntries());

    expect(text).toContain('【学习上下文');
    // 三段标题齐备
    expect(text).toContain('■ 患者画像');
    expect(text).toContain('■ 医生偏好');
    expect(text).toContain('■ 科室知识沉淀');

    // 顺序：患者画像段位置 < 医生偏好段 < 科室知识段
    const iPatient = text.indexOf('■ 患者画像');
    const iDoctor = text.indexOf('■ 医生偏好');
    const iDept = text.indexOf('■ 科室知识沉淀');
    expect(iPatient).toBeGreaterThan(-1);
    expect(iDoctor).toBeGreaterThan(iPatient);
    expect(iDept).toBeGreaterThan(iDoctor);

    // 关键内容被渲染
    expect(text).toContain('高血压');
    expect(text).toContain('苯磺酸氨氯地平片×12');
    expect(text).toContain('[临床路径] 社区获得性肺炎路径');
  });

  it('患者段只渲染实质行：占位治疗 / 占位摘要被省略', () => {
    const p = patientProfile({
      preferredTreatment: '暂无足够就诊数据，偏好治疗方式待积累。',
      recentVisitsSummary: '暂无就诊记录。',
    });
    const text = buildAgentContext(null, p, null);

    expect(text).toContain('慢病：高血压');
    expect(text).toContain('药物反应');
    expect(text).not.toContain('暂无足够就诊数据');
    expect(text).not.toContain('暂无就诊记录');
  });

  it('只有一路数据时只渲染该段，其余段标题不出现', () => {
    const text = buildAgentContext(doctorPref(), null, null);

    expect(text).toContain('■ 医生偏好');
    expect(text).not.toContain('■ 患者画像');
    expect(text).not.toContain('■ 科室知识沉淀');
    expect(text).toContain('常用药品：苯磺酸氨氯地平片×12');
  });
});

describe('buildAgentContext 空数据兜底', () => {
  it('三路全 null 返回冷启动兜底文案，不抛错', () => {
    const text = buildAgentContext(null, null, null);
    expect(text).toContain('暂无可复用的学习数据');
    expect(text).not.toContain('■');
  });

  it('空数组 / 空标签结构等价于无数据', () => {
    const emptyPref: DoctorPreference = {
      preferredDrugs: [],
      preferredExams: [],
      commonPathways: [],
    };
    const text = buildAgentContext(emptyPref, patientProfile({ chronicConditions: [], drugReactions: [], riskFlags: [], preferredTreatment: '', recentVisitsSummary: '' }), []);
    expect(text).toContain('暂无可复用的学习数据');
  });

  it('null / undefined 入参不抛错', () => {
    expect(() => buildAgentContext(undefined, undefined, undefined)).not.toThrow();
  });
});

describe('buildAgentContext 患者数据脱敏（依据宪法第三章）', () => {
  it('patientId 等直接标识符不出现在上下文文本中', () => {
    const p = patientProfile({ patientId: 'P-9527' });
    const text = buildAgentContext(doctorPref(), p, deptEntries());
    expect(text).not.toContain('P-9527');
    expect(text).not.toContain('patientId');
  });

  it('空 patientId 字段不渲染、不报错', () => {
    const p = patientProfile({ patientId: '' });
    expect(() => buildAgentContext(null, p, null)).not.toThrow();
  });
});

describe('priorityOrder 优先级排序', () => {
  const sections: AgentContextSection[] = [
    { kind: 'deptKnowledge', priority: CONTEXT_PRIORITY.deptKnowledge, text: '科室段' },
    { kind: 'patientProfile', priority: CONTEXT_PRIORITY.patientProfile, text: '患者段' },
    { kind: 'doctorPreference', priority: CONTEXT_PRIORITY.doctorPreference, text: '医生段' },
  ];

  it('按 患者画像 > 医生偏好 > 科室知识 降序', () => {
    const ordered = priorityOrder(sections);
    expect(ordered.map((s) => s.kind)).toEqual([
      'patientProfile',
      'doctorPreference',
      'deptKnowledge',
    ]);
  });

  it('空文本段沉底，不参与高优先级占位', () => {
    const mixed: AgentContextSection[] = [
      { kind: 'patientProfile', priority: 30, text: '' },
      { kind: 'doctorPreference', priority: 20, text: '医生段' },
      { kind: 'deptKnowledge', priority: 10, text: '科室段' },
    ];
    const ordered = priorityOrder(mixed);
    expect(ordered.map((s) => s.kind)).toEqual([
      'doctorPreference',
      'deptKnowledge',
      'patientProfile',
    ]);
  });

  it('返回新数组、不修改入参', () => {
    const input = [...sections];
    priorityOrder(input);
    expect(input.map((s) => s.kind)).toEqual([
      'deptKnowledge',
      'patientProfile',
      'doctorPreference',
    ]);
  });

  it('空数组返回空数组', () => {
    expect(priorityOrder([])).toEqual([]);
  });
});
