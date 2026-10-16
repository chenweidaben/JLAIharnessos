/**
 * 健澜科技 jlmedaios - 【科研管理深化】纯函数单测（M162-C）
 *
 * 覆盖：
 *  - buildResearchPortfolio：科室年度组合过滤 / 三档课题计数 / 经费与论文汇总；
 *  - trackProjectMilestone：里程碑顺序推进、进度档位回写、状态闭环、
 *    重复 / 倒序 / 非法阶段拦截；
 *  - calculateResearchImpact：论文 40 + 转化 30 + 经费 20 + 进度 10 透明口径锚点。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  SEED_PROJECTS,
  buildResearchPortfolio,
  calculateResearchImpact,
  trackProjectMilestone,
} from '../../src/bff/aggregators/researchDeepAggregator';

/** 按 id 取种子课题（测试锚点） */
function byId(id: string) {
  const p = SEED_PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`种子课题缺失：${id}`);
  return p;
}

describe('buildResearchPortfolio 科室年度课题组合', () => {
  it('NEU 2026：命中 3 项课题（国自然/省自然/院级各 1）', () => {
    const r = buildResearchPortfolio('NEU', 2026, SEED_PROJECTS);
    expect(r.summary.totalCount).toBe(3);
    expect(r.summary.byCategory.nsfc).toBe(1);
    expect(r.summary.byCategory.provincial).toBe(1);
    expect(r.summary.byCategory.institute).toBe(1);
  });

  it('经费汇总：预算 73 万 / 支出 40.9 万', () => {
    const r = buildResearchPortfolio('NEU', 2026, SEED_PROJECTS);
    expect(r.summary.budgetTotal).toBe(73);
    expect(r.summary.spentTotal).toBeCloseTo(40.9, 1);
  });

  it('论文分阶段：投稿 1 / 接收 1 / 发表 2，累计引用 15', () => {
    const r = buildResearchPortfolio('NEU', 2026, SEED_PROJECTS);
    expect(r.summary.paperCounts.submitted).toBe(1);
    expect(r.summary.paperCounts.accepted).toBe(1);
    expect(r.summary.paperCounts.published).toBe(2);
    expect(r.summary.totalCitations).toBe(15);
  });

  it('成果转化：软件 1 项 + 产品 1 项', () => {
    const r = buildResearchPortfolio('NEU', 2026, SEED_PROJECTS);
    expect(r.summary.outputCounts.software).toBe(1);
    expect(r.summary.outputCounts.product).toBe(1);
    expect(r.summary.outputCounts.patent).toBe(0);
  });

  it('跨年度过滤：CAR 2025 命中国自然验收课题 1 项', () => {
    const r = buildResearchPortfolio('CAR', 2025, SEED_PROJECTS);
    expect(r.summary.totalCount).toBe(1);
    expect(r.projects[0]!.status).toBe('accepted');
  });

  it('空科室 / 非法年度抛错', () => {
    expect(() => buildResearchPortfolio('', 2026, SEED_PROJECTS)).toThrow();
    expect(() => buildResearchPortfolio('NEU', 1999, SEED_PROJECTS)).toThrow();
  });

  it('空组合安全返回零值', () => {
    const r = buildResearchPortfolio('XXX', 2026, SEED_PROJECTS);
    expect(r.summary.totalCount).toBe(0);
    expect(r.summary.avgImpact).toBe(0);
  });
});

describe('calculateResearchImpact 影响力透明口径', () => {
  it('国自然在研课题 NEU-001：论文16 + 转化6 + 经费11.35 + 进度6 ≈ 39.35（D，<40）', () => {
    // 发表 1 篇 → 10；引用 12×0.5=6；软件授权 6；31.2/55×20≈11.35；60%进度→6
    const imp = calculateResearchImpact(byId('PRJ-2026-NEU-001'));
    expect(imp.breakdown.paper).toBe(16);
    expect(imp.breakdown.output).toBe(6);
    expect(imp.breakdown.budget).toBeCloseTo(11.35, 1);
    expect(imp.breakdown.progress).toBe(6);
    expect(imp.score).toBeCloseTo(39.35, 1);
    expect(imp.grade).toBe('D');
  });

  it('验收满勤课题 CAR-008：论文40(封顶) + 转化29 + 经费19.4 + 进度10 = 98.4（A）', () => {
    // 发表/被引 2 篇 → 20 封顶；引用 56×0.5=28 → 20 封顶；专利8+软著6+产品15=29；
    // 48.5/50×20=19.4；100%进度→10
    const imp = calculateResearchImpact(byId('PRJ-2025-CAR-008'));
    expect(imp.breakdown.paper).toBe(40);
    expect(imp.breakdown.output).toBe(29);
    expect(imp.breakdown.budget).toBeCloseTo(19.4, 1);
    expect(imp.breakdown.progress).toBe(10);
    expect(imp.score).toBeCloseTo(98.4, 1);
    expect(imp.grade).toBe('A');
  });

  it('入参非法抛错', () => {
    expect(() => calculateResearchImpact({} as never)).toThrow();
  });
});

describe('trackProjectMilestone 里程碑推进', () => {
  it('NEU-002（approval/40%）登记 midterm → 进度 60、状态 active、追加里程碑', () => {
    const before = byId('PRJ-2026-NEU-002');
    const next = trackProjectMilestone(before, {
      name: '中期检查通过',
      stage: 'midterm',
      recordedAt: '2026-10-01',
    });
    expect(next.progress).toBe(60);
    expect(next.status).toBe('active');
    expect(next.milestones).toHaveLength(before.milestones.length + 1);
    expect(next.milestones.at(-1)!.stage).toBe('midterm');
    // 纯函数：原对象不被修改
    expect(before.progress).toBe(40);
  });

  it('登记 closing → 状态闭环为 completed；再登记 acceptance → accepted / 100%', () => {
    const p0 = byId('PRJ-2026-NEU-003'); // 当前 closing 已登记、completed、90%
    expect(p0.status).toBe('completed');
    const next = trackProjectMilestone(p0, { name: '验收通过', stage: 'acceptance' });
    expect(next.progress).toBe(100);
    expect(next.status).toBe('accepted');
  });

  it('重复阶段（approval 已登记）抛错', () => {
    const p0 = byId('PRJ-2026-NEU-002');
    expect(() => trackProjectMilestone(p0, { name: '重复立项', stage: 'approval' })).toThrow();
  });

  it('倒序补登（midterm 已登记后再登记 approval）抛错', () => {
    const p0 = byId('PRJ-2026-NEU-001'); // 已到 midterm
    expect(() => trackProjectMilestone(p0, { name: '补立项', stage: 'approval' })).toThrow();
  });

  it('非法阶段 / 空名称抛错', () => {
    const p0 = byId('PRJ-2026-NEU-002');
    expect(() => trackProjectMilestone(p0, { name: 'x', stage: 'unknown' })).toThrow();
    expect(() => trackProjectMilestone(p0, { name: '', stage: 'closing' })).toThrow();
  });
});
