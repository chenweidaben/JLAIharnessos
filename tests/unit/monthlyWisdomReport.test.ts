/**
 * 健澜科技 jlmedaios - 医院智慧资产月度报表纯函数单测（M119-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  formatWisdomReport,
  generateMonthlyWisdomReport,
  type WisdomExperience,
} from '../../src/bff/aggregators/monthlyWisdomReportAggregator';

/** 构造一条经验行的快捷函数 */
function exp(partial: Partial<WisdomExperience> & Pick<WisdomExperience, 'staffId' | 'createdAt'>): WisdomExperience {
  return {
    staffName: partial.staffName ?? '员工',
    deptCode: partial.deptCode ?? '',
    topic: partial.topic ?? '默认主题',
    decisionCount: partial.decisionCount ?? 1,
    isFailure: partial.isFailure ?? false,
    ...partial,
  };
}

describe('generateMonthlyWisdomReport - 入参校验', () => {
  it('month 非法（0 / 13 / NaN）返回零值报表', () => {
    const r1 = generateMonthlyWisdomReport(2026, 0, []);
    expect(r1.totalNew).toBe(0);
    expect(r1.top5Active).toEqual([]);
    expect(r1.top3Lessons).toEqual([]);

    const r2 = generateMonthlyWisdomReport(2026, 13, []);
    expect(r2.totalNew).toBe(0);

    const r3 = generateMonthlyWisdomReport(2026, NaN, []);
    expect(r3.totalNew).toBe(0);
  });

  it('null / undefined 入参不抛异常，返回零值', () => {
    const r = generateMonthlyWisdomReport(2026, 10, null);
    expect(r.totalNew).toBe(0);
    expect(r.successCount).toBe(0);
    expect(r.lessonCount).toBe(0);
    expect(r.growthVsLastMonth.previousTotalNew).toBe(0);
    expect(r.growthVsLastMonth.ratioPct).toBeNull();
  });
});

describe('generateMonthlyWisdomReport - 当月切片与分桶', () => {
  const rows: WisdomExperience[] = [
    // 当月（2026-10）
    exp({ staffId: 's1', staffName: '陈主任', deptCode: '内一', topic: 'CAP 抗感染', decisionCount: 12, createdAt: '2026-10-05T09:00:00Z' }),
    exp({ staffId: 's1', staffName: '陈主任', deptCode: '内一', topic: '脓毒症复苏', decisionCount: 8, createdAt: '2026-10-12T09:00:00Z' }),
    exp({ staffId: 's2', staffName: '李护士长', deptCode: '急诊', topic: '胸痛分诊', decisionCount: 10, createdAt: '2026-10-08T09:00:00Z' }),
    exp({ staffId: 's2', staffName: '李护士长', deptCode: '急诊', topic: '胺碘酮外渗', decisionCount: 2, isFailure: true, createdAt: '2026-10-09T09:00:00Z' }),
    exp({ staffId: 's3', staffName: '王药师', deptCode: '药剂', topic: '万古剂量', decisionCount: 6, createdAt: '2026-10-15T09:00:00Z' }),
    exp({ staffId: 's3', staffName: '王药师', deptCode: '药剂', topic: '华法林相互作用', decisionCount: 1, isFailure: true, createdAt: '2026-10-16T09:00:00Z' }),
    // 上月（2026-09）——不计入当月 totalNew，但计入环比基数
    exp({ staffId: 's4', staffName: '赵医生', deptCode: '外一', topic: '腹腔镜术后', decisionCount: 5, createdAt: '2026-09-20T09:00:00Z' }),
    exp({ staffId: 's5', staffName: '孙医生', deptCode: '儿科', topic: '小儿惊厥', decisionCount: 4, createdAt: '2026-09-22T09:00:00Z' }),
    // 更早月份——应被忽略
    exp({ staffId: 's6', staffName: '钱医生', deptCode: '内科', topic: '2025 旧账', decisionCount: 99, createdAt: '2025-10-01T09:00:00Z' }),
  ];

  it('当月 totalNew = 成功条数 + 教训条数（6 条）', () => {
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.totalNew).toBe(6);
    expect(r.successCount).toBe(4);
    expect(r.lessonCount).toBe(2);
  });

  it('环比上月：上月 2 条，当月 6 条，delta=+4，ratioPct=+200', () => {
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.growthVsLastMonth.previousTotalNew).toBe(2);
    expect(r.growthVsLastMonth.delta).toBe(4);
    expect(r.growthVsLastMonth.ratioPct).toBe(200);
  });

  it('top5Active 按 decisionCount 合计降序，陈主任 20 次第 1', () => {
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.top5Active.length).toBe(3);
    expect(r.top5Active[0].staffName).toBe('陈主任');
    expect(r.top5Active[0].decisionCount).toBe(20);
    expect(r.top5Active[1].staffName).toBe('李护士长');
    expect(r.top5Active[1].decisionCount).toBe(12);
    expect(r.top5Active[2].staffName).toBe('王药师');
  });

  it('top5Active 每条同时记录 successCount / lessonCount', () => {
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    const chen = r.top5Active.find((a) => a.staffName === '陈主任');
    expect(chen?.successCount).toBe(2);
    expect(chen?.lessonCount).toBe(0);
    const li = r.top5Active.find((a) => a.staffName === '李护士长');
    expect(li?.successCount).toBe(1);
    expect(li?.lessonCount).toBe(1);
  });

  it('top3Lessons 只收失败行，按出现次数降序', () => {
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.top3Lessons.length).toBe(2);
    expect(r.top3Lessons[0].topic).toBe('胺碘酮外渗');
    expect(r.top3Lessons[0].occurrenceCount).toBe(1);
    expect(r.top3Lessons[1].topic).toBe('华法林相互作用');
  });

  it('跨年上月回退：month=1 时上月是上年 12 月', () => {
    const rows2: WisdomExperience[] = [
      exp({ staffId: 'a', staffName: 'A', topic: '当月', decisionCount: 3, createdAt: '2026-01-05T09:00:00Z' }),
      exp({ staffId: 'b', staffName: 'B', topic: '上年12月', decisionCount: 2, createdAt: '2025-12-15T09:00:00Z' }),
    ];
    const r = generateMonthlyWisdomReport(2026, 1, rows2);
    expect(r.totalNew).toBe(1);
    expect(r.growthVsLastMonth.previousTotalNew).toBe(1);
    expect(r.growthVsLastMonth.delta).toBe(0);
    expect(r.growthVsLastMonth.ratioPct).toBe(0);
  });

  it('上月无基数时 ratioPct 为 null（首次统计）', () => {
    const rows2: WisdomExperience[] = [
      exp({ staffId: 'a', staffName: 'A', topic: '当月', decisionCount: 3, createdAt: '2026-10-05T09:00:00Z' }),
    ];
    const r = generateMonthlyWisdomReport(2026, 10, rows2);
    expect(r.growthVsLastMonth.previousTotalNew).toBe(0);
    expect(r.growthVsLastMonth.delta).toBe(1);
    expect(r.growthVsLastMonth.ratioPct).toBeNull();
  });
});

describe('generateMonthlyWisdomReport - top5/top3 截断', () => {
  it('活跃员工超过 5 人时只取前 5', () => {
    const rows: WisdomExperience[] = Array.from({ length: 8 }, (_, i) =>
      exp({ staffId: `s${i}`, staffName: `员工${i}`, decisionCount: i + 1, createdAt: '2026-10-05T09:00:00Z' }),
    );
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.top5Active.length).toBe(5);
    // 决策次数最高的是员工7（decisionCount=8）
    expect(r.top5Active[0].staffName).toBe('员工7');
  });

  it('教训超过 3 条时只取前 3', () => {
    const rows: WisdomExperience[] = Array.from({ length: 5 }, (_, i) =>
      exp({ staffId: `s${i}`, staffName: `员工${i}`, topic: `教训${i}`, isFailure: true, createdAt: '2026-10-05T09:00:00Z' }),
    );
    const r = generateMonthlyWisdomReport(2026, 10, rows);
    expect(r.top3Lessons.length).toBe(3);
  });
});

describe('formatWisdomReport - 可打印文本', () => {
  it('包含月份、四项计数、活跃榜、教训榜与版权行', () => {
    const rows: WisdomExperience[] = [
      exp({ staffId: 's1', staffName: '陈主任', deptCode: '内一', topic: 'CAP 抗感染', decisionCount: 12, createdAt: '2026-10-05T09:00:00Z' }),
      exp({ staffId: 's2', staffName: '李护士长', deptCode: '急诊', topic: '胺碘酮外渗', decisionCount: 2, isFailure: true, createdAt: '2026-10-09T09:00:00Z' }),
      exp({ staffId: 's3', staffName: '赵医生', topic: '腹腔镜', decisionCount: 5, createdAt: '2026-09-20T09:00:00Z' }),
    ];
    const report = generateMonthlyWisdomReport(2026, 10, rows);
    const text = formatWisdomReport(report);

    expect(text).toContain('医院智慧资产月度报表');
    expect(text).toContain('统计月份：2026-10');
    expect(text).toContain('新增经验总数：2 条');
    expect(text).toContain('成功经验：1 条');
    expect(text).toContain('失败教训：1 条');
    expect(text).toContain('最活跃员工 Top5');
    expect(text).toContain('陈主任');
    expect(text).toContain('重点教训 Top3');
    expect(text).toContain('胺碘酮外渗');
    expect(text).toContain('杭州健澜科技有限公司');
    expect(text).toContain('宪法第七章');
  });

  it('零值报表也能格式化，榜单显示占位文案', () => {
    const report = generateMonthlyWisdomReport(2026, 10, []);
    const text = formatWisdomReport(report);
    expect(text).toContain('新增经验总数：0 条');
    expect(text).toContain('当月暂无活跃员工沉淀');
    expect(text).toContain('当月暂无失败教训沉淀');
    expect(text).toContain('上月无基数');
  });

  it('环比下降时显示负号', () => {
    const rows: WisdomExperience[] = [
      exp({ staffId: 'a', staffName: 'A', topic: '当月', decisionCount: 1, createdAt: '2026-10-05T09:00:00Z' }),
      exp({ staffId: 'b', staffName: 'B', topic: '上月1', decisionCount: 1, createdAt: '2026-09-05T09:00:00Z' }),
      exp({ staffId: 'c', staffName: 'C', topic: '上月2', decisionCount: 1, createdAt: '2026-09-06T09:00:00Z' }),
    ];
    const report = generateMonthlyWisdomReport(2026, 10, rows);
    expect(report.growthVsLastMonth.delta).toBe(-1);
    const text = formatWisdomReport(report);
    expect(text).toContain('环比上月：-1 条');
  });
});
