/**
 * 健澜科技 jlmedaios - 教学管理纯函数单测（M140-C · 医院管理深化）
 *
 * 覆盖：
 *   - createTeachingPlan：四类教学自动归类、规培考核挂钩标记、学分收敛、入参校验；
 *   - recordTeachingAttendance：到勤才计学分、计划必须存在、日期合法性；
 *   - generateTeachingReport：账期过滤、计划/学分/到勤率、分类别汇总、
 *     带教老师工作量统计。
 *
 * 与持久化解耦：不触库（persistPlan / persistAttendance 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createTeachingPlan,
  generateTeachingReport,
  recordTeachingAttendance,
  resetTeachingLedger,
} from '../../src/bff/aggregators/teachingAggregator';

beforeEach(() => resetTeachingLedger());

describe('createTeachingPlan 教学计划登记', () => {
  it('按授课对象/课程名自动归类四类教学，规培与三基默认挂钩考核', () => {
    const residency = createTeachingPlan(
      '住院医师查房示范',
      'D001',
      '内科规培一组',
      '周三 16:00',
      2,
      '内科',
      { createdAt: '2026-10-05T09:00:00Z' },
    );
    expect(residency.category).toBe('residency');
    expect(residency.categoryLabel).toBe('规培生教学');
    expect(residency.assessLinked).toBe(true);

    const internship = createTeachingPlan(
      '外科缝合带教',
      'D002',
      '外科实习生',
      '',
      0.5,
      '外科',
      { createdAt: '2026-10-05T09:00:00Z' },
    );
    expect(internship.category).toBe('internship');
    expect(internship.categoryLabel).toBe('实习生带教');
    expect(internship.assessLinked).toBe(false);
    // schedule 为空时兜底「时间待定」
    expect(internship.schedule).toBe('时间待定');

    const lecture = createTeachingPlan(
      '合理用药继续教育讲座',
      'D003',
      '全院医护',
      '周五大报告厅',
      2,
      '药剂科',
      { createdAt: '2026-10-05T09:00:00Z' },
    );
    expect(lecture.category).toBe('lecture');
    expect(lecture.categoryLabel).toBe('继续教育讲座');
    expect(lecture.assessLinked).toBe(false);

    const threeBasics = createTeachingPlan(
      '心肺复苏三基培训',
      'D004',
      '三基考核队',
      '',
      1.5,
      '急诊科',
      { createdAt: '2026-10-05T09:00:00Z' },
    );
    expect(threeBasics.category).toBe('three_basics');
    expect(threeBasics.categoryLabel).toBe('三基三严培训');
    expect(threeBasics.assessLinked).toBe(true);
  });

  it('学分保留 1 位小数，非法入参抛错', () => {
    const p = createTeachingPlan('三基操作考核', 'D004', '三基考核队', '', 1.26, '急诊科', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    expect(p.credits).toBe(1.3);

    expect(() => createTeachingPlan('', 'D001', '规培生', '', 1, '内科')).toThrow();
    expect(() => createTeachingPlan('课', '', '规培生', '', 1, '内科')).toThrow();
    expect(() => createTeachingPlan('课', 'D001', '', '', 1, '内科')).toThrow();
    expect(() => createTeachingPlan('课', 'D001', '规培生', '', 1, '')).toThrow();
    expect(() => createTeachingPlan('课', 'D001', '规培生', '', -1, '内科')).toThrow();
    expect(() => createTeachingPlan('课', 'D001', '规培生', '', NaN, '内科')).toThrow();
  });
});

describe('recordTeachingAttendance 考勤记录', () => {
  it('到勤才按计划学分认定学分，缺勤计 0', () => {
    const plan = createTeachingPlan('心电图判读', 'D001', '内科规培一组', '', 2, '内科', {
      createdAt: '2026-10-05T09:00:00Z',
    });

    const attended = recordTeachingAttendance(plan.id, 'S001', true, '2026-10-06');
    expect(attended.attended).toBe(true);
    expect(attended.creditsEarned).toBe(2);
    expect(attended.date).toBe('2026-10-06');

    const absent = recordTeachingAttendance(plan.id, 'S002', false, '2026-10-06');
    expect(absent.attended).toBe(false);
    expect(absent.creditsEarned).toBe(0);
  });

  it('计划不存在 / 学员为空 / 日期非法时抛错', () => {
    expect(() => recordTeachingAttendance('not-exist-id', 'S001', true, '2026-10-06')).toThrow();
    expect(() => recordTeachingAttendance('', 'S001', true, '2026-10-06')).toThrow();

    const plan = createTeachingPlan('课', 'D001', '规培生', '', 1, '内科', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    expect(() => recordTeachingAttendance(plan.id, '', true, '2026-10-06')).toThrow();
    expect(() => recordTeachingAttendance(plan.id, 'S001', true, '10/06/2026')).toThrow();
  });
});

describe('generateTeachingReport 教学报表与工作量统计', () => {
  it('按账期汇总计划数/学分/到勤率，分类别与带教老师工作量', () => {
    // 2026-10 的三门课：D001 两门（规培+三基），D002 一门讲座
    const p1 = createTeachingPlan('查房示范', 'D001', '内科规培一组', '', 2, '内科', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    createTeachingPlan('三基操作', 'D001', '三基考核队', '', 1, '急诊科', {
      createdAt: '2026-10-08T09:00:00Z',
    });
    const p3 = createTeachingPlan('继续教育讲座', 'D002', '全院医护', '', 3, '药剂科', {
      createdAt: '2026-10-10T09:00:00Z',
    });
    // 2026-09 的课应被账期过滤
    createTeachingPlan('上月课', 'D009', '规培生', '', 5, '内科', {
      createdAt: '2026-09-20T09:00:00Z',
    });

    // 考勤：p1 三人（2 到勤 1 缺勤），p3 一人到勤
    recordTeachingAttendance(p1.id, 'S001', true, '2026-10-06');
    recordTeachingAttendance(p1.id, 'S002', true, '2026-10-06');
    recordTeachingAttendance(p1.id, 'S003', false, '2026-10-06');
    recordTeachingAttendance(p3.id, 'S010', true, '2026-10-11');

    const report = generateTeachingReport('2026-10');
    expect(report.period).toBe('2026-10');
    expect(report.totalPlans).toBe(3); // 9 月那门被过滤
    expect(report.totalCredits).toBe(6); // 2 + 1 + 3
    expect(report.totalAttendance).toBe(4);
    expect(report.attendanceRate).toBe(0.75); // 3 到勤 / 4
    // 规培 + 三基挂钩，讲座不挂钩
    expect(report.assessLinkedPlans).toBe(2);

    // 分类别：residency 2 学分、three_basics 1 学分、lecture 3 学分，按学分降序
    expect(report.byCategory).toHaveLength(3);
    expect(report.byCategory[0].category).toBe('lecture');
    expect(report.byCategory[0].totalCredits).toBe(3);
    const residency = report.byCategory.find((c) => c.category === 'residency');
    expect(residency?.planCount).toBe(1);
    expect(residency?.attendanceCount).toBe(3);
    expect(residency?.attendanceRate).toBe(0.6667);

    // 带教老师工作量：D001 两门 3 学分 3 人次；D002 一门 3 学分 1 人次
    expect(report.teacherWorkload).toHaveLength(2);
    // 学分相同(3)，按授课门数降序 → D001(2门) 在前
    expect(report.teacherWorkload[0].teacherId).toBe('D001');
    expect(report.teacherWorkload[0].planCount).toBe(2);
    expect(report.teacherWorkload[0].totalCredits).toBe(3);
    expect(report.teacherWorkload[0].attendanceCount).toBe(3);
    expect(report.teacherWorkload[1].teacherId).toBe('D002');
    expect(report.teacherWorkload[1].attendanceCount).toBe(1);
  });

  it('账期格式非法抛错；空账期到勤率为 0', () => {
    expect(() => generateTeachingReport('2026/10')).toThrow();
    expect(() => generateTeachingReport('2026-13')).toThrow();

    const empty = generateTeachingReport('2026-11');
    expect(empty.totalPlans).toBe(0);
    expect(empty.totalCredits).toBe(0);
    expect(empty.attendanceRate).toBe(0);
    expect(empty.byCategory).toHaveLength(0);
    expect(empty.teacherWorkload).toHaveLength(0);
  });
});
