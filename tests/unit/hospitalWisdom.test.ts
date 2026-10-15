/**
 * 健澜科技 jlmedaios - 全院智慧资产看板 Hospital MUSE（M116-D）纯函数单测
 *
 * 依据宪法第七章：7.2 全院层聚合、7.7 失败经验单独成「教训」桶、
 * 7.9 按主题检索全院专家（人才地图）。全部 mock 数据，不依赖数据库。
 *
 * 覆盖：全院经验总量 / 教训总量 / 活跃员工去重、科室对比分桶与三级排序、
 *       按月增长趋势分桶与时间序、专家榜主题过滤与频次-成功率排序、
 *       入参纯度（不改原数组）、空输入零值兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildHospitalWisdomDashboard,
  rankExpertsByTopic,
  type HospitalStaffMuseEntry,
  type KnowledgeAsset,
  type LessonRecord,
} from '../../src/bff/aggregators/hospitalWisdomAggregator';

/** 构造员工经验行（默认成功，可覆盖） */
function makeEntry(overrides: Partial<HospitalStaffMuseEntry> = {}): HospitalStaffMuseEntry {
  return {
    staffId: 's1',
    staffName: '医生甲',
    role: 'doctor',
    deptCode: 'DEP-IM',
    deptName: '内科',
    topic: 'CAP路径',
    content: '做法',
    decisionCount: 10,
    isFailure: false,
    successRate: 0.9,
    createdAt: '2026-08-10T09:00:00.000Z',
    ...overrides,
  };
}

describe('buildHospitalWisdomDashboard 全院聚合（宪法 7.2 / 7.7）', () => {
  it('全院经验总量只累加成功经验决策次数，失败经验不计入', () => {
    const muses = [
      makeEntry({ decisionCount: 10 }),
      makeEntry({ staffId: 's2', decisionCount: 20 }),
      makeEntry({ staffId: 's3', decisionCount: 5, isFailure: true, successRate: 0.1 }),
    ];
    const r = buildHospitalWisdomDashboard(muses, [], []);
    expect(r.totalExperiences).toBe(30);
  });

  it('教训总量取教训台账条数（7.7 单独成桶）', () => {
    const lessons: LessonRecord[] = [
      { lessonId: 'l1', topic: '桥接窗口' },
      { lessonId: 'l2', topic: '术后发热' },
    ];
    const r = buildHospitalWisdomDashboard([], [], lessons);
    expect(r.totalLessons).toBe(2);
  });

  it('活跃沉淀员工按 staffId 去重', () => {
    const muses = [
      makeEntry({ staffId: 's1', decisionCount: 5 }),
      makeEntry({ staffId: 's1', topic: '另一主题', decisionCount: 3 }),
      makeEntry({ staffId: 's2', staffName: '医生乙', decisionCount: 7 }),
    ];
    const r = buildHospitalWisdomDashboard(muses, [], []);
    expect(r.activeStaff).toBe(2);
  });

  it('科室对比按科室分桶：员工数 / 经验次数 / 知识条数 / 教训条数', () => {
    const muses = [
      makeEntry({ staffId: 'a', deptCode: 'DEP-CARD', deptName: '心内科', decisionCount: 40 }),
      makeEntry({ staffId: 'b', deptCode: 'DEP-CARD', deptName: '心内科', decisionCount: 10 }),
      makeEntry({ staffId: 'c', deptCode: 'DEP-SURG', deptName: '外科', decisionCount: 25 }),
    ];
    const knowledge: KnowledgeAsset[] = [{ knowledgeId: 'k1', title: 'SOP', deptCode: 'DEP-CARD' }];
    const lessons: LessonRecord[] = [{ lessonId: 'l1', topic: 't', deptCode: 'DEP-SURG' }];
    const r = buildHospitalWisdomDashboard(muses, knowledge, lessons);

    const card = r.deptComparison.find((d) => d.deptCode === 'DEP-CARD');
    expect(card?.staffCount).toBe(2);
    expect(card?.experienceCount).toBe(50);
    expect(card?.knowledgeCount).toBe(1);
    expect(card?.lessonCount).toBe(0);

    const surg = r.deptComparison.find((d) => d.deptCode === 'DEP-SURG');
    expect(surg?.lessonCount).toBe(1);
  });

  it('科室对比三级排序：经验降序 → 员工数降序 → 编码升序（确定性）', () => {
    const muses = [
      makeEntry({ staffId: 'a', deptCode: 'B-DEP', deptName: 'B科', decisionCount: 10 }),
      makeEntry({ staffId: 'b', deptCode: 'A-DEP', deptName: 'A科', decisionCount: 10 }),
      makeEntry({ staffId: 'c', deptCode: 'A-DEP', deptName: 'A科', decisionCount: 10 }),
      makeEntry({ staffId: 'd', deptCode: 'C-DEP', deptName: 'C科', decisionCount: 99 }),
    ];
    const r = buildHospitalWisdomDashboard(muses, [], []);
    // C(99) 第一；A/B 经验同为10，但 A 员工2 > B 员工1，故 A 第二、B 第三
    expect(r.deptComparison.map((d) => d.deptCode)).toEqual(['C-DEP', 'A-DEP', 'B-DEP']);
  });

  it('增长趋势按统计月（YYYY-MM）分桶，period 升序（字典序即时间序）', () => {
    const muses = [
      makeEntry({ createdAt: '2026-06-15T09:00:00Z', decisionCount: 10 }),
      makeEntry({ staffId: 's2', createdAt: '2026-08-01T09:00:00Z', decisionCount: 20 }),
      makeEntry({ staffId: 's3', createdAt: '2026-08-20T09:00:00Z', decisionCount: 5 }),
    ];
    const knowledge: KnowledgeAsset[] = [
      { knowledgeId: 'k1', title: 'k', createdAt: '2026-08-05T00:00:00Z' },
    ];
    const lessons: LessonRecord[] = [
      { lessonId: 'l1', topic: 't', createdAt: '2026-06-02T00:00:00Z' },
    ];
    const r = buildHospitalWisdomDashboard(muses, knowledge, lessons);

    expect(r.growthTrend.map((p) => p.period)).toEqual(['2026-06', '2026-08']);
    const jun = r.growthTrend.find((p) => p.period === '2026-06');
    expect(jun?.experiences).toBe(10);
    expect(jun?.lessons).toBe(1);
    const aug = r.growthTrend.find((p) => p.period === '2026-08');
    expect(aug?.experiences).toBe(25);
    expect(aug?.knowledge).toBe(1);
  });

  it('空输入返回结构完整的零值结果，绝不抛错', () => {
    const r = buildHospitalWisdomDashboard(null, undefined, []);
    expect(r.totalExperiences).toBe(0);
    expect(r.totalLessons).toBe(0);
    expect(r.activeStaff).toBe(0);
    expect(r.deptComparison).toEqual([]);
    expect(r.growthTrend).toEqual([]);
  });

  it('纯函数：不修改入参数组与对象', () => {
    const muses = [makeEntry({ decisionCount: 5 })];
    const snapshot = muses.map((m) => ({ ...m }));
    buildHospitalWisdomDashboard(muses, [], []);
    expect(muses).toEqual(snapshot);
  });
});

describe('rankExpertsByTopic 专家榜（宪法 7.9 人才地图）', () => {
  it('只消费主题精确匹配的成功经验，失败教训不评专家', () => {
    const muses = [
      makeEntry({ staffId: 'a', staffName: '王医生', topic: 'STEMI再灌注', decisionCount: 30 }),
      makeEntry({ staffId: 'b', staffName: '李医生', topic: 'CAP路径', decisionCount: 99 }),
      makeEntry({ staffId: 'c', staffName: '赵医生', topic: 'STEMI再灌注', isFailure: true, decisionCount: 50 }),
    ];
    const experts = rankExpertsByTopic('STEMI再灌注', muses);
    expect(experts.map((e) => e.staffId)).toEqual(['a']);
  });

  it('同一员工多条经验合并：次数累加、成功率按次数加权', () => {
    const muses = [
      makeEntry({ staffId: 'a', staffName: '王医生', topic: 'CAP路径', decisionCount: 10, successRate: 1 }),
      makeEntry({ staffId: 'a', staffName: '王医生', topic: 'CAP路径', decisionCount: 30, successRate: 0.8 }),
    ];
    const experts = rankExpertsByTopic('CAP路径', muses);
    expect(experts).toHaveLength(1);
    expect(experts[0].decisionCount).toBe(40);
    // (1*10 + 0.8*30)/40 = 0.85
    expect(experts[0].successRate).toBe(0.85);
  });

  it('三级排序：次数降序 → 成功率降序 → 姓名字典序', () => {
    const muses = [
      makeEntry({ staffId: 'a', staffName: '丙', topic: 'X', decisionCount: 10, successRate: 0.9 }),
      makeEntry({ staffId: 'b', staffName: '甲', topic: 'X', decisionCount: 20, successRate: 0.8 }),
      makeEntry({ staffId: 'c', staffName: '乙', topic: 'X', decisionCount: 20, successRate: 0.9 }),
    ];
    const experts = rankExpertsByTopic('X', muses);
    // 次数：b/c=20 > a=10；同为20时成功率 c(0.9) > b(0.8)
    expect(experts.map((e) => e.staffName)).toEqual(['乙', '甲', '丙']);
  });

  it('主题为空或无匹配返回空数组，不抛错', () => {
    expect(rankExpertsByTopic('  ', [makeEntry()])).toEqual([]);
    expect(rankExpertsByTopic('不存在主题', null)).toEqual([]);
  });

  it('纯函数：不修改入参数组', () => {
    const muses = [makeEntry({ staffId: 'a', topic: 'Y' })];
    const snapshot = muses.map((m) => ({ ...m }));
    rankExpertsByTopic('Y', muses);
    expect(muses).toEqual(snapshot);
  });
});
