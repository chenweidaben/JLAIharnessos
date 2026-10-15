/**
 * 健澜科技 jlmedaios - 科室经验聚合 Dept MUSE（M114-C）纯函数单测
 *
 * 依据宪法第七章：7.2 科室层跨角色聚合、7.7 失败经验单独成「教训」桶、
 * 7.8 新员工入职自动加载科室基线。全部 mock 数据，不依赖数据库。
 *
 * 覆盖：buildDeptMuse 聚合逻辑、频次三级排序、多角色合并、
 *       科室基线构建、失败经验分桶、newHireStartingPoint 挂载、
 *       入参纯度（不改原数组）、空科室零值兜底、上榜条数截断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  aggregateTopics,
  buildDeptMuse,
  rankTopics,
  type StaffMuseEntry,
} from '../../src/bff/aggregators/deptMuseAggregator';

/** 构造测试经验行（默认成功经验，可覆盖） */
function makeEntry(
  topic: string,
  decisionCount: number,
  overrides: Partial<StaffMuseEntry> = {},
): StaffMuseEntry {
  return {
    staffId: `staff-${topic}`,
    staffName: `医生${topic}`,
    role: 'doctor',
    deptCode: 'DEP-IM',
    topic,
    content: `${topic} 的做法`,
    decisionCount,
    isFailure: false,
    successRate: 0.9,
    ...overrides,
  };
}

describe('aggregateTopics 按主题合并员工经验', () => {
  it('同一主题的决策次数跨员工累加', () => {
    const a = makeEntry('CAP路径', 10);
    const b = makeEntry('CAP路径', 5, { staffId: 'staff-2' });
    const merged = aggregateTopics([a, b], false);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalCount).toBe(15);
    expect(merged[0].staffCount).toBe(2);
  });

  it('不同主题各自成桶', () => {
    const merged = aggregateTopics(
      [makeEntry('CAP路径', 10), makeEntry('降糖路径', 8)],
      false,
    );
    expect(merged.map((t) => t.topic).sort()).toEqual(['CAP路径', '降糖路径']);
  });

  it('lesson 标记透传：失败桶聚合后 lesson=true', () => {
    const merged = aggregateTopics([makeEntry('皮试失误', 3, { isFailure: true })], true);
    expect(merged[0].lesson).toBe(true);
  });

  it('加权有效率按决策次数加权，保留 4 位小数', () => {
    const a = makeEntry('CAP路径', 10, { successRate: 1 });
    const b = makeEntry('CAP路径', 10, { successRate: 0.8, staffId: 'staff-2' });
    const merged = aggregateTopics([a, b], false);
    // (1*10 + 0.8*10) / 20 = 0.9
    expect(merged[0].avgSuccessRate).toBe(0.9);
  });

  it('代表性正文取单员工决策次数最高者的写法', () => {
    const low = makeEntry('CAP路径', 2, { content: '低频次写法' });
    const high = makeEntry('CAP路径', 20, { content: '高频写法', staffId: 'staff-2' });
    const merged = aggregateTopics([low, high], false);
    expect(merged[0].content).toBe('高频写法');
  });

  it('空数组返回空数组', () => {
    expect(aggregateTopics([], false)).toEqual([]);
  });
});

describe('rankTopics 频次三级排序（确定性）', () => {
  it('总次数高者排前面', () => {
    const low = aggregateTopics([makeEntry('低', 3)], false)[0];
    const high = aggregateTopics([makeEntry('高', 20)], false)[0];
    const sorted = rankTopics([low, high]);
    expect(sorted.map((t) => t.topic)).toEqual(['高', '低']);
  });

  it('次数相同时，参与员工多者优先', () => {
    const one = aggregateTopics([makeEntry('单人', 5)], false)[0];
    const many = aggregateTopics(
      [makeEntry('多人', 5), makeEntry('多人', 5, { staffId: 's2' })],
      false,
    )[0];
    const sorted = rankTopics([one, many]);
    expect(sorted.map((t) => t.topic)).toEqual(['多人', '单人']);
  });

  it('次数与员工数都相同时，主题字典序升序', () => {
    const b = aggregateTopics([makeEntry('beta', 5)], false)[0];
    const a = aggregateTopics([makeEntry('alpha', 5)], false)[0];
    expect(rankTopics([b, a]).map((t) => t.topic)).toEqual(['alpha', 'beta']);
  });

  it('纯函数：不修改入参数组', () => {
    const list = aggregateTopics([makeEntry('x', 1)], false);
    const snapshot = list.map((t) => t.topic);
    rankTopics(list);
    expect(list.map((t) => t.topic)).toEqual(snapshot);
  });
});

describe('buildDeptMuse 科室经验聚合（宪法 7.2 / 7.7 / 7.8）', () => {
  it('多角色合并：医生+护士同主题 → roles 覆盖双角色且 canonical 排序', () => {
    const doc = makeEntry('跌倒初筛', 8, { role: 'doctor' });
    const nur = makeEntry('跌倒初筛', 6, { role: 'nurse', staffId: 's-nurse' });
    const { topDecisions } = buildDeptMuse('DEP-IM', [doc, nur]);
    expect(topDecisions).toHaveLength(1);
    expect(topDecisions[0].roles).toEqual(['doctor', 'nurse']);
    expect(topDecisions[0].staffCount).toBe(2);
    expect(topDecisions[0].totalCount).toBe(14);
  });

  it('药师角色并入同一聚合，roles 三件套顺序为 doctor/nurse/pharmacist', () => {
    const muses = [
      makeEntry('合理用药', 4, { role: 'pharmacist', staffId: 'sp' }),
      makeEntry('合理用药', 7, { role: 'doctor', staffId: 'sd' }),
      makeEntry('合理用药', 5, { role: 'nurse', staffId: 'sn' }),
    ];
    const { topDecisions } = buildDeptMuse('DEP-IM', muses);
    expect(topDecisions[0].roles).toEqual(['doctor', 'nurse', 'pharmacist']);
  });

  it('失败经验单独标记「教训」类，且不进入 topDecisions', () => {
    const good = makeEntry('常规皮试', 12);
    const bad = makeEntry('皮试失误', 4, { isFailure: true, successRate: 0.2 });
    const result = buildDeptMuse('DEP-IM', [good, bad]);
    expect(result.topDecisions.map((t) => t.topic)).toEqual(['常规皮试']);
    expect(result.topFailures).toHaveLength(1);
    expect(result.topFailures[0].topic).toBe('皮试失误');
    expect(result.topFailures[0].lesson).toBe(true);
  });

  it('科室基线构建：员工数、角色覆盖、累计次数、基线主题', () => {
    const muses = [
      makeEntry('A', 10, { role: 'doctor', staffId: 's1' }),
      makeEntry('B', 6, { role: 'nurse', staffId: 's2' }),
      makeEntry('A', 4, { role: 'doctor', staffId: 's3' }),
    ];
    const { deptBaseline } = buildDeptMuse('DEP-IM', muses);
    expect(deptBaseline.deptCode).toBe('DEP-IM');
    expect(deptBaseline.staffSize).toBe(3);
    expect(deptBaseline.roleCoverage).toEqual(['doctor', 'nurse']);
    expect(deptBaseline.totalEntries).toBe(3);
    expect(deptBaseline.totalDecisionCount).toBe(20);
    // 基线主题 = topDecisions 主题按频次降序（A=14 > B=6）
    expect(deptBaseline.baselineTopics).toEqual(['A', 'B']);
  });

  it('其他科室的数据被过滤，不进入聚合', () => {
    const mine = makeEntry('本科室', 10);
    const other = makeEntry('外科室', 99, { deptCode: 'DEP-SUR' });
    const { deptBaseline, topDecisions } = buildDeptMuse('DEP-IM', [mine, other]);
    expect(deptBaseline.totalEntries).toBe(1);
    expect(topDecisions.map((t) => t.topic)).toEqual(['本科室']);
  });

  it('newHireStartingPoint 自动挂载基线 + 必读教训 + 推荐决策（7.8）', () => {
    const good = makeEntry('CAP路径', 10);
    const bad = makeEntry('交接班遗漏', 3, { isFailure: true });
    const result = buildDeptMuse('DEP-IM', [good, bad]);
    const sp = result.newHireStartingPoint;
    expect(sp.deptCode).toBe('DEP-IM');
    expect(sp.deptBaseline).toBe(result.deptBaseline);
    expect(sp.mustKnowLessons.map((t) => t.topic)).toEqual(['交接班遗漏']);
    expect(sp.recommendedDecisions.map((t) => t.topic)).toEqual(['CAP路径']);
  });

  it('上榜条数截断：maxDecisions / maxFailures 生效', () => {
    const muses: StaffMuseEntry[] = [
      makeEntry('g1', 10),
      makeEntry('g2', 9),
      makeEntry('g3', 8),
      makeEntry('b1', 5, { isFailure: true }),
      makeEntry('b2', 4, { isFailure: true }),
    ];
    const result = buildDeptMuse('DEP-IM', muses, {
      maxDecisions: 2,
      maxFailures: 1,
    });
    expect(result.topDecisions).toHaveLength(2);
    expect(result.topFailures).toHaveLength(1);
    expect(result.topFailures[0].topic).toBe('b1');
  });

  it('空输入返回结构完整的零值结果，绝不抛错', () => {
    const result = buildDeptMuse('DEP-IM', []);
    expect(result.deptBaseline).toEqual({
      deptCode: 'DEP-IM',
      staffSize: 0,
      roleCoverage: [],
      totalEntries: 0,
      totalDecisionCount: 0,
      baselineTopics: [],
    });
    expect(result.topDecisions).toEqual([]);
    expect(result.topFailures).toEqual([]);
    expect(result.newHireStartingPoint.mustKnowLessons).toEqual([]);
    expect(result.newHireStartingPoint.recommendedDecisions).toEqual([]);
  });

  it('纯函数：不修改入参数组与对象', () => {
    const muses = [
      makeEntry('x', 5, { isFailure: false }),
      makeEntry('y', 2, { isFailure: true }),
    ];
    const snapshot = muses.map((m) => ({ ...m }));
    buildDeptMuse('DEP-IM', muses);
    expect(muses).toEqual(snapshot);
  });
});
