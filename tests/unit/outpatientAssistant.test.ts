/**
 * 健澜科技 jlmedaios - 门诊医生智能助手聚合器纯函数单测（依据宪法第七章 Doctor MUSE）。
 *
 * 不依赖数据库：覆盖三条主线——
 *   ① 上下文聚合（患者摘要 / 科室路径 / 预警）
 *   ② 推荐排序（相似病例按匹配分降序、同分按 caseId 升序、不修改入参）
 *   ③ 空数据兜底（data 为 null / 字段缺省 / 未知科室码均不抛异常）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildOutpatientAssistant,
  buildDeptPath,
  deriveWarnings,
  maskPatientName,
  sortExperience,
  type DeptNode,
  type ExperienceCase,
  type OutpatientAssistantInput,
  type PatientContextInput,
} from '@/bff/aggregators/outpatientAssistantAggregator';

const deptTree: DeptNode[] = [
  { code: 'DEPT-HOSP', name: '临床医疗系统' },
  { code: 'DEPT-INT', name: '内科系统', parentCode: 'DEPT-HOSP' },
  { code: 'DEPT-CARD', name: '心血管内科', parentCode: 'DEPT-INT' },
];

const patient: PatientContextInput = {
  name: '张建国',
  age: 67,
  gender: '男',
  chronicTags: ['原发性高血压', '2型糖尿病'],
  allergies: ['青霉素类'],
  recentVisits: [{ dept: '心血管内科', diagnosis: '高血压复诊', date: '2026-09-22' }],
  abnormalLabs: [
    { item: '血钾', value: '5.9 mmol/L', level: 'critical' },
    { item: '低密度脂蛋白', value: '3.6 mmol/L', level: 'high' },
  ],
};

const experience: ExperienceCase[] = [
  { caseId: 'CASE-B', title: '老年降压方案', diagnosis: '高血压', suggestion: '小剂量起始', score: 76 },
  { caseId: 'CASE-A', title: '血钾偏高处理', diagnosis: '高钾血症', suggestion: '暂停保钾药', score: 95 },
  { caseId: 'CASE-C', title: '同分享例', diagnosis: '冠心病', suggestion: '经验 C', score: 95 },
];

/* ------------------------------ ① 上下文聚合 ------------------------------ */

describe('buildOutpatientAssistant · 上下文聚合', () => {
  it('聚合患者摘要：姓名脱敏、慢病标签、最近就诊', () => {
    const view = buildOutpatientAssistant('doc-1', 'pt-1', 'DEPT-CARD', {
      patient,
      experience,
      deptTree,
    });
    expect(view.patientSummary.name).toBe('张*国');
    expect(view.patientSummary.ageText).toBe('67岁');
    expect(view.patientSummary.gender).toBe('男');
    expect(view.patientSummary.chronicTags).toEqual(['原发性高血压', '2型糖尿病']);
    expect(view.patientSummary.lastVisit).toBe('2026-09-22 心血管内科 · 高血压复诊');
    expect(view.patientSummary.hasAllergy).toBe(true);
  });

  it('聚合科室路径：沿 parentCode 回溯祖先链', () => {
    const view = buildOutpatientAssistant('doc-1', 'pt-1', 'DEPT-CARD', { deptTree });
    expect(view.deptPath.deptName).toBe('心血管内科');
    expect(view.deptPath.ancestors).toEqual(['临床医疗系统', '内科系统']);
    expect(view.deptPath.pathText).toBe('临床医疗系统 / 内科系统 / 心血管内科');
  });

  it('聚合预警：过敏史 + 危急值 + 老年提醒，且高危在前', () => {
    const view = buildOutpatientAssistant('doc-1', 'pt-1', 'DEPT-CARD', { patient });
    const types = view.warnings.map((w) => w.type);
    expect(types).toContain('allergy');
    expect(types).toContain('criticalLab');
    expect(types).toContain('elderly');
    // criticalLab 只收集 level=critical，high 不入预警
    expect(view.warnings.filter((w) => w.type === 'criticalLab')).toHaveLength(1);
    expect(view.warnings.find((w) => w.type === 'criticalLab')?.message).toContain('血钾');
  });

  it('输出不回显 doctorId / patientId（标识最小化）', () => {
    const view = buildOutpatientAssistant('doc-secret', 'pt-secret', 'DEPT-CARD', { patient });
    expect(JSON.stringify(view)).not.toContain('doc-secret');
    expect(JSON.stringify(view)).not.toContain('pt-secret');
  });
});

/* ------------------------------ ② 推荐排序 ------------------------------ */

describe('sortExperience · 推荐排序', () => {
  it('按匹配分降序', () => {
    const sorted = sortExperience(experience);
    expect(sorted.map((s) => s.caseId)).toEqual(['CASE-A', 'CASE-C', 'CASE-B']);
  });

  it('同分按 caseId 升序保证结果确定', () => {
    const sorted = sortExperience(experience);
    expect(sorted[0].caseId).toBe('CASE-A');
    expect(sorted[1].caseId).toBe('CASE-C');
  });

  it('不修改入参', () => {
    const snapshot = experience.map((c) => ({ ...c }));
    sortExperience(experience);
    expect(experience).toEqual(snapshot);
  });

  it('入参为 null/非数组时返回空数组', () => {
    expect(sortExperience(null)).toEqual([]);
    expect(sortExperience(undefined)).toEqual([]);
    expect(sortExperience('x' as unknown as ExperienceCase[])).toEqual([]);
  });
});

/* ------------------------------ ③ 空数据兜底 ------------------------------ */

describe('buildOutpatientAssistant · 空数据兜底', () => {
  it('data 为 null 时全部走兜底，不抛异常', () => {
    const view = buildOutpatientAssistant('doc-1', 'pt-1', 'DEPT-CARD', null);
    expect(view.patientSummary.name).toBe('待确认患者');
    expect(view.patientSummary.ageText).toBe('年龄未知');
    expect(view.patientSummary.chronicTags).toEqual([]);
    expect(view.patientSummary.lastVisit).toBeNull();
    expect(view.patientSummary.hasAllergy).toBe(false);
    expect(view.doctorExperience).toEqual([]);
    expect(view.deptPath.deptName).toBe('DEPT-CARD');
    expect(view.deptPath.pathText).toBe('DEPT-CARD');
    expect(view.warnings).toEqual([
      { level: 'info', type: 'missingProfile', message: '未读取到本次就诊患者档案，请先确认患者身份' },
    ]);
  });

  it('未知科室码兜底为 code 本身', () => {
    expect(buildDeptPath('DEPT-NEW', deptTree)).toEqual({
      deptCode: 'DEPT-NEW',
      deptName: 'DEPT-NEW',
      ancestors: [],
      pathText: 'DEPT-NEW',
    });
  });

  it('科室树为空 / 无 code 时兜底「未知科室」', () => {
    expect(buildDeptPath('', [])).toEqual({
      deptCode: '',
      deptName: '未知科室',
      ancestors: [],
      pathText: '未知科室',
    });
  });

  it('缺省字段：无过敏 / 无危急值 / 非老年时不产生对应预警', () => {
    const view = buildOutpatientAssistant('doc-1', 'pt-1', 'DEPT-CARD', {
      patient: { name: '李四', age: 30, gender: '女' },
    } as OutpatientAssistantInput);
    expect(view.warnings).toEqual([]);
  });
});

/* ------------------------------ 其他纯函数 ------------------------------ */

describe('maskPatientName · 脱敏', () => {
  it('三字名保留首尾', () => {
    expect(maskPatientName('张建国')).toBe('张*国');
  });
  it('两字名处理为「姓*」', () => {
    expect(maskPatientName('李四')).toBe('李*');
  });
  it('空值兜底', () => {
    expect(maskPatientName('')).toBe('待确认患者');
    expect(maskPatientName(undefined)).toBe('待确认患者');
  });
});

describe('deriveWarnings · 预警推导', () => {
  it('患者缺失给出 missingProfile 提示', () => {
    expect(deriveWarnings(null)[0].type).toBe('missingProfile');
  });
});
