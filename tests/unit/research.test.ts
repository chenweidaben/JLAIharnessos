/**
 * 健澜科技 jlmedaios - M140-B 科研项目管理纯函数单测（医院管理深化）
 *
 * 覆盖：项目登记（申报中起步、参数校验）、进度更新四态闭环
 * （申报中->进行中->已结题->已验收，登记完不会停摆）、年度报告聚合、
 * 非法输入与已验收冻结防御。全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';

import {
  generateResearchReport,
  listResearchProjects,
  registerResearchProject,
  resetResearchProjectStore,
  updateResearchProgress,
} from '../../src/bff/aggregators/researchAggregator';

describe('科研项目登记', () => {
  beforeEach(() => resetResearchProjectStore());

  it('登记后为申报中、进度 0、带业务编号', () => {
    const p = registerResearchProject('肺癌早期预警研究', 'D10086', '呼吸科', 20, '2026-01-01', '2027-12-31');
    expect(p.status).toBe('applying');
    expect(p.progress).toBe(0);
    expect(p.id).toMatch(/^P-2026-\d{4}$/);
    expect(p.funding).toBe(20);
    expect(p.milestone).toBe('项目申报');
    expect(p.milestones).toHaveLength(1);
  });

  it('缺名称 / 缺负责人 / 缺科室 -> 抛错', () => {
    expect(() => registerResearchProject('', 'D1', '内科', 10, '2026-01-01', '2026-12-31')).toThrow(/名称/);
    expect(() => registerResearchProject('题', '', '内科', 10, '2026-01-01', '2026-12-31')).toThrow(/负责人/);
    expect(() => registerResearchProject('题', 'D1', '', 10, '2026-01-01', '2026-12-31')).toThrow(/科室/);
  });

  it('负经费 / 结束早于开始 / 日期格式错 -> 抛错', () => {
    expect(() => registerResearchProject('题', 'D1', '内科', -5, '2026-01-01', '2026-12-31')).toThrow(/经费/);
    expect(() => registerResearchProject('题', 'D1', '内科', 10, '2026-12-31', '2026-01-01')).toThrow(/早于/);
    expect(() => registerResearchProject('题', 'D1', '内科', 10, '2026/01/01', '2026-12-31')).toThrow(/yyyy-mm-dd/);
  });
});

describe('科研项目进度闭环（跟踪到结题）', () => {
  beforeEach(() => resetResearchProjectStore());

  it('申报中 + 进度>0 -> 自动转入进行中', () => {
    const p = registerResearchProject('题A', 'D1', '内科', 10, '2026-01-01', '2026-12-31');
    const up = updateResearchProgress(p.id, 30, '伦理审查通过');
    expect(up.status).toBe('active');
    expect(up.progress).toBe(30);
    expect(up.milestone).toBe('伦理审查通过');
    expect(up.milestones.length).toBe(2);
  });

  it('进度到 100 -> 自动收口为已结题（不停在进行中）', () => {
    const p = registerResearchProject('题B', 'D2', '外科', 15, '2026-01-01', '2026-12-31');
    updateResearchProgress(p.id, 40, '中期检查');
    const done = updateResearchProgress(p.id, 100, '结题材料提交');
    expect(done.status).toBe('completed');
    expect(done.progress).toBe(100);
  });

  it('已结题 + 里程碑含「验收」 -> 已验收闭环', () => {
    const p = registerResearchProject('题C', 'D3', '儿科', 8, '2026-01-01', '2026-12-31');
    updateResearchProgress(p.id, 100, '结题材料提交');
    const acc = updateResearchProgress(p.id, 100, '验收通过');
    expect(acc.status).toBe('accepted');
  });

  it('已验收项目禁止再改进度（闭环后冻结）', () => {
    const p = registerResearchProject('题D', 'D4', '骨科', 5, '2026-01-01', '2026-12-31');
    updateResearchProgress(p.id, 100, '结题材料提交');
    updateResearchProgress(p.id, 100, '验收通过');
    expect(() => updateResearchProgress(p.id, 100, '再改')).toThrow(/已验收/);
  });

  it('未知项目 / 非法进度 / 空里程碑 -> 抛错', () => {
    const p = registerResearchProject('题E', 'D5', '内科', 5, '2026-01-01', '2026-12-31');
    expect(() => updateResearchProgress('P-9999-0001', 50, '中期')).toThrow(/不存在/);
    expect(() => updateResearchProgress(p.id, 150, '中期')).toThrow(/0~100/);
    expect(() => updateResearchProgress(p.id, 50, '')).toThrow(/里程碑/);
  });
});

describe('年度科研报告生成', () => {
  beforeEach(() => resetResearchProjectStore());

  it('按年度归集四态、经费与科室汇总', () => {
    const a = registerResearchProject('题1', 'D1', '内科', 10, '2026-01-01', '2026-12-31');
    const b = registerResearchProject('题2', 'D2', '外科', 20, '2026-03-01', '2027-06-30');
    const c = registerResearchProject('题3', 'D3', '内科', 5, '2026-05-01', '2026-11-30');
    // a: 进行中 40%
    updateResearchProgress(a.id, 40, '中期检查');
    // b: 已结题
    updateResearchProgress(b.id, 100, '结题材料提交');
    // c: 已验收
    updateResearchProgress(c.id, 100, '结题材料提交');
    updateResearchProgress(c.id, 100, '验收通过');

    const rpt = generateResearchReport(2026);
    expect(rpt.year).toBe(2026);
    expect(rpt.total).toBe(3);
    expect(rpt.byStatus.active).toBe(1);
    expect(rpt.byStatus.completed).toBe(1);
    expect(rpt.byStatus.accepted).toBe(1);
    expect(rpt.completedCount).toBe(1);
    expect(rpt.acceptedCount).toBe(1);
    expect(rpt.totalFunding).toBe(35);
    // avg = (40+100+100)/3 ≈ 80
    expect(rpt.avgProgress).toBe(80);
    // 内科 2 项 15 万，外科 1 项 20 万 -> 按经费降序
    expect(rpt.byDept).toHaveLength(2);
    expect(rpt.byDept[0].dept).toBe('外科');
    expect(rpt.byDept[0].funding).toBe(20);
  });

  it('只统计指定年度，不串年', () => {
    registerResearchProject('旧题', 'D9', '内科', 10, '2025-01-01', '2025-12-31');
    registerResearchProject('新题', 'D8', '内科', 10, '2026-02-01', '2026-12-31');
    expect(generateResearchReport(2025).total).toBe(1);
    expect(generateResearchReport(2026).total).toBe(1);
    expect(generateResearchReport(2099).total).toBe(0);
  });

  it('非法年度 -> 抛错', () => {
    expect(() => generateResearchReport(1800)).toThrow(/年度/);
  });

  it('列表按更新时间倒序、可按状态过滤', () => {
    const a = registerResearchProject('题X', 'D1', '内科', 5, '2026-01-01', '2026-12-31');
    registerResearchProject('题Y', 'D2', '外科', 5, '2026-01-01', '2026-12-31');
    updateResearchProgress(a.id, 10, '立项公示');
    const active = listResearchProjects({ status: 'active' });
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(a.id);
  });
});
