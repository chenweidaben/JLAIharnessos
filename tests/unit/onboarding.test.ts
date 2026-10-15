/**
 * 健澜科技 jlmedaios - 后继者入职向导 Onboarding（M115-C）纯函数单测
 *
 * 依据宪法第七章 7.8「后继者机制」：新员工入职自动加载科室基线。
 * 全部 mock 数据，不依赖数据库。
 *
 * 覆盖：基线加载（欢迎语 + 经验总数）、Top5 成功 / Top3 教训截断与
 *       频次排序继承、科室推荐路径组装、角色/科室中文称呼、
 *       空科室零值兜底、入参纯度（不改原对象）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { buildDeptMuse, type StaffMuseEntry } from '../../src/bff/aggregators/deptMuseAggregator';
import {
  buildNewHireOnboarding,
  MAX_TOP_LESSONS,
  MAX_TOP_SUCCESSES,
} from '../../src/bff/aggregators/onboardingAggregator';

const DEPT_CODE = 'DEP-IM';

/** 构造测试经验行（默认成功经验，可覆盖） */
function makeEntry(
  topic: string,
  decisionCount: number,
  overrides: Partial<StaffMuseEntry> = {},
): StaffMuseEntry {
  return {
    staffId: `staff-${topic}`,
    staffName: `前辈${topic}`,
    role: 'doctor',
    deptCode: DEPT_CODE,
    topic,
    content: `${topic} 的做法`,
    decisionCount,
    isFailure: false,
    successRate: 0.9,
    ...overrides,
  };
}

/** 造一个有成功经验 + 教训的内科 DeptMuse */
function buildSampleDeptMuse(): ReturnType<typeof buildDeptMuse> {
  return buildDeptMuse(DEPT_CODE, [
    makeEntry('高频决策A', 30),
    makeEntry('高频决策B', 20),
    makeEntry('高频决策C', 10),
    makeEntry('教训甲', 5, { isFailure: true }),
    makeEntry('教训乙', 4, { isFailure: true }),
  ]);
}

describe('基线加载：欢迎语与经验总数', () => {
  it('欢迎语包含科室名、角色称呼与前辈经验总条数', () => {
    const deptMuse = buildSampleDeptMuse();
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.welcomeMessage).toContain('欢迎加入内科');
    expect(ob.welcomeMessage).toContain('医生新同事');
    expect(ob.welcomeMessage).toContain('5 条经验');
    expect(ob.totalExperiences).toBe(5);
  });

  it('未命中科室字典时回落「{code}科」', () => {
    const deptMuse = buildDeptMuse('DEP-X', [makeEntry('x', 3, { deptCode: 'DEP-X' })]);
    const ob = buildNewHireOnboarding('nurse', 'DEP-X', deptMuse);
    expect(ob.welcomeMessage).toContain('欢迎加入DEP-X科');
    expect(ob.welcomeMessage).toContain('护士新同事');
  });

  it('未知角色回落「同事」', () => {
    const deptMuse = buildSampleDeptMuse();
    const ob = buildNewHireOnboarding('unknown', DEPT_CODE, deptMuse);
    expect(ob.welcomeMessage).toContain('同事新同事');
  });
});

describe('Top N 排序与截断（继承 M114 频次排序）', () => {
  it('Top5 成功经验按频次降序，且不超过 5 条', () => {
    const muses: StaffMuseEntry[] = Array.from({ length: 8 }, (_, i) =>
      makeEntry(`成功${i}`, 40 - i),
    );
    const deptMuse = buildDeptMuse(DEPT_CODE, muses);
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.topSuccesses).toHaveLength(MAX_TOP_SUCCESSES);
    expect(ob.topSuccesses.map((t) => t.topic)).toEqual([
      '成功0', '成功1', '成功2', '成功3', '成功4',
    ]);
    // 频次降序
    const counts = ob.topSuccesses.map((t) => t.totalCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('Top3 重要教训按频次降序，且不超过 3 条', () => {
    const muses: StaffMuseEntry[] = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`教训${i}`, 10 - i, { isFailure: true }),
    );
    const deptMuse = buildDeptMuse(DEPT_CODE, muses);
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.topLessons).toHaveLength(MAX_TOP_LESSONS);
    expect(ob.topLessons.map((t) => t.topic)).toEqual(['教训0', '教训1', '教训2']);
  });

  it('经验条目只投影向导字段，不含 lesson 标记', () => {
    const deptMuse = buildSampleDeptMuse();
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    const first = ob.topSuccesses[0];
    expect(first.topic).toBe('高频决策A');
    expect(first.content).toBe('高频决策A 的做法');
    expect(first).not.toHaveProperty('lesson');
  });

  it('成功 / 教训分桶互不串：成功清单不含教训', () => {
    const deptMuse = buildSampleDeptMuse();
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.topSuccesses.map((t) => t.topic)).not.toContain('教训甲');
    expect(ob.topLessons.map((t) => t.topic)).toEqual(['教训甲', '教训乙']);
  });
});

describe('科室推荐路径 deptPath', () => {
  it('有经验时生成「研读基线→模仿成功→牢记教训→带教首例」四步', () => {
    const deptMuse = buildSampleDeptMuse();
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.deptPath).toHaveLength(4);
    expect(ob.deptPath[0]).toContain('第1步');
    expect(ob.deptPath[1]).toContain('高频决策A');
    expect(ob.deptPath[2]).toContain('教训甲');
    expect(ob.deptPath[3]).toContain('带教');
  });

  it('无教训时第3步自动跳过，步骤文案连续', () => {
    const deptMuse = buildDeptMuse(DEPT_CODE, [makeEntry('只有成功', 9)]);
    const ob = buildNewHireOnboarding('nurse', DEPT_CODE, deptMuse);
    expect(ob.topLessons).toEqual([]);
    expect(ob.deptPath.map((s) => s.slice(0, 3))).toEqual(['第1步', '第2步', '第4步']);
  });
});

describe('空科室兜底（绝不抛错）', () => {
  it('空 DeptMuse 返回零值向导 + 冷启动指引', () => {
    const deptMuse = buildDeptMuse(DEPT_CODE, []);
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(ob.totalExperiences).toBe(0);
    expect(ob.topSuccesses).toEqual([]);
    expect(ob.topLessons).toEqual([]);
    expect(ob.welcomeMessage).toContain('尚未沉淀任何经验');
    expect(ob.deptPath).toHaveLength(1);
    expect(ob.deptPath[0]).toContain('带教老师');
  });

  it('deptMuse 为 null 也安全兜底', () => {
    const ob = buildNewHireOnboarding('doctor', DEPT_CODE, null);
    expect(ob.totalExperiences).toBe(0);
    expect(ob.topSuccesses).toEqual([]);
    expect(ob.deptPath[0]).toContain('带教老师');
  });
});

describe('纯函数：不修改入参', () => {
  it('调用前后 DeptMuse 与经验行保持原样', () => {
    const muses = [makeEntry('x', 5), makeEntry('y', 2, { isFailure: true })];
    const snapshot = muses.map((m) => ({ ...m }));
    const deptMuse = buildDeptMuse(DEPT_CODE, muses);
    const baselineSnapshot = { ...deptMuse.deptBaseline };
    buildNewHireOnboarding('doctor', DEPT_CODE, deptMuse);
    expect(muses).toEqual(snapshot);
    expect(deptMuse.deptBaseline).toEqual(baselineSnapshot);
  });
});
