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
  buildOnboardingGuide,
  getOnboardingProgress,
  getShortcuts,
  personalizeHomepage,
  recordOnboardingProgress,
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

/* ============================================================================
 * M134-A · 新员工入职向导（时间轴 4 阶段 + 进度追踪）
 * ==========================================================================*/

describe('M134-A 引导生成：四阶段时间轴', () => {
  it('返回 day1/week1/month1/month3 四个阶段，顺序固定', () => {
    const guide = buildOnboardingGuide('staff-001', 'doctor');
    expect(guide.stages.map((s) => s.stageKey)).toEqual([
      'day1',
      'week1',
      'month1',
      'month3',
    ]);
  });

  it('每个阶段都有标题、目标与任务，taskId 形如 {stage}-{idx}', () => {
    const guide = buildOnboardingGuide('staff-001', 'doctor');
    for (const stage of guide.stages) {
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.goal.length).toBeGreaterThan(0);
      expect(stage.tasks.length).toBeGreaterThan(0);
      stage.tasks.forEach((t, idx) => {
        expect(t.taskId).toBe(`${stage.stageKey}-${idx + 1}`);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
        expect(t.estimatedHours).toBeGreaterThan(0);
      });
    }
  });

  it('医生岗位总任务数 = 4 + 3 + 2 + 2 = 11', () => {
    const guide = buildOnboardingGuide('staff-001', 'doctor');
    expect(guide.totalTasks).toBe(11);
    expect(guide.stages.reduce((s, st) => s + st.tasks.length, 0)).toBe(11);
  });

  it('欢迎语包含角色称呼与「90 天路线图」', () => {
    const guide = buildOnboardingGuide('staff-001', 'doctor');
    expect(guide.role).toBe('doctor');
    expect(guide.roleLabel).toBe('医生');
    expect(guide.welcome).toContain('医生');
    expect(guide.welcome).toContain('90 天路线图');
  });

  it('staffId 原样回显', () => {
    const guide = buildOnboardingGuide('staff-xyz-999', 'nurse');
    expect(guide.staffId).toBe('staff-xyz-999');
  });
});

describe('M134-A 角色差异化', () => {
  it('医生 / 护士 / 药师的第1周任务文案各不相同', () => {
    const doc = buildOnboardingGuide('s1', 'doctor');
    const nur = buildOnboardingGuide('s2', 'nurse');
    const pha = buildOnboardingGuide('s3', 'pharmacist');
    const docWeek1 = doc.stages[1].tasks.map((t) => t.title).join('|');
    const nurWeek1 = nur.stages[1].tasks.map((t) => t.title).join('|');
    const phaWeek1 = pha.stages[1].tasks.map((t) => t.title).join('|');
    expect(docWeek1).not.toBe(nurWeek1);
    expect(nurWeek1).not.toBe(phaWeek1);
    expect(docWeek1).not.toBe(phaWeek1);
    // 各自带岗位关键词
    expect(docWeek1).toContain('病历');
    expect(nurWeek1).toContain('护理');
    expect(phaWeek1).toContain('处方');
  });

  it('管理员岗位第3月任务聚焦运营改进', () => {
    const admin = buildOnboardingGuide('s4', 'admin');
    const month3 = admin.stages[3].tasks.map((t) => t.title).join('|');
    expect(month3).toContain('运营');
  });

  it('未知角色回落 doctor，不抛错', () => {
    const g1 = buildOnboardingGuide('s5', '');
    const g2 = buildOnboardingGuide('s6', undefined);
    const g3 = buildOnboardingGuide('s7', 'superman');
    expect(g1.role).toBe('doctor');
    expect(g2.role).toBe('doctor');
    expect(g3.role).toBe('doctor');
    expect(g1.roleLabel).toBe('医生');
  });
});

describe('M134-A 进度追踪 getOnboardingProgress', () => {
  it('第1天任务全部完成（登录即开机）', () => {
    const p = getOnboardingProgress('staff-001');
    const day1 = p.stages.find((s) => s.stageKey === 'day1')!;
    expect(day1.completed).toBe(day1.total);
  });

  it('百分比落在 0~100 闭区间，且与已完成/总数一致', () => {
    for (const id of ['a', 'bb', 'ccc', 'staff-001', 'staff-xyz']) {
      const p = getOnboardingProgress(id);
      expect(p.percent).toBeGreaterThanOrEqual(0);
      expect(p.percent).toBeLessThanOrEqual(100);
      expect(p.completedTasks).toBe(
        p.stages.reduce((sum, s) => sum + s.completed, 0),
      );
      expect(p.totalTasks).toBe(p.stages.reduce((sum, s) => sum + s.total, 0));
      expect(p.totalTasks).toBe(11);
    }
  });

  it('同一 staffId 两次调用结果完全一致（纯函数确定性）', () => {
    const a = getOnboardingProgress('staff-deterministic');
    const b = getOnboardingProgress('staff-deterministic');
    expect(a).toEqual(b);
  });

  it('智慧度基线固定 20，当前 >= 基线，封顶 100', () => {
    const p = getOnboardingProgress('staff-001');
    expect(p.wisdomBaseline).toBe(20);
    expect(p.wisdomCurrent).toBeGreaterThanOrEqual(p.wisdomBaseline);
    expect(p.wisdomCurrent).toBeLessThanOrEqual(100);
  });

  it('currentStage 是第一个未完成阶段', () => {
    const p = getOnboardingProgress('staff-001');
    const firstIncomplete = p.stages.find((s) => s.completed < s.total);
    expect(p.currentStage).toBe(firstIncomplete?.stageKey ?? 'month3');
  });

  it('空 staffId 也安全兜底，不抛错', () => {
    const p = getOnboardingProgress('');
    expect(p.staffId).toBe('');
    expect(p.stages.length).toBe(4);
  });
});

/* ============================================================================
 * M155-D · 用户体验深化——新手引导与个性化
 * 覆盖：按入职天数返回此刻该看的几步、超过 90 天不打扰、角色差异化、
 *       快捷键过滤、首页个性化、标记完成一步后的进度投影、纯函数确定性。
 * ==========================================================================*/

describe('M155-D 引导节奏 buildOnboardingGuide(role, days)', () => {
  it('第 0~1 天返回开机三件套（登录/工作台/改密），stage=day1', () => {
    for (const days of [0, 1]) {
      const steps = buildOnboardingGuide('doctor', days);
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps.every((s) => s.stage === 'day1')).toBe(true);
      expect(steps.map((s) => s.stepId)).toEqual(
        expect.arrayContaining(['day1-login', 'day1-workbench', 'day1-password']),
      );
    }
  });

  it('第 2~7 天进入 week1，医生拿到医嘱/病历/处方三步', () => {
    for (const days of [2, 5, 7]) {
      const steps = buildOnboardingGuide('doctor', days);
      expect(steps.every((s) => s.stage === 'week1')).toBe(true);
      const ids = steps.map((s) => s.stepId).join('|');
      expect(ids).toContain('week1-order');
      expect(ids).toContain('week1-emr');
      expect(ids).toContain('week1-prescription');
    }
  });

  it('第 8~30 天进入 month1，含 AI 助手与经验沉淀', () => {
    for (const days of [8, 15, 30]) {
      const steps = buildOnboardingGuide('doctor', days);
      expect(steps.every((s) => s.stage === 'month1')).toBe(true);
      const ids = steps.map((s) => s.stepId).join('|');
      expect(ids).toContain('month1-ai-assistant');
      expect(ids).toContain('month1-experience');
    }
  });

  it('第 31~90 天进入 month3，含快捷键与批量操作', () => {
    for (const days of [31, 60, 90]) {
      const steps = buildOnboardingGuide('admin', days);
      expect(steps.every((s) => s.stage === 'month3')).toBe(true);
      const ids = steps.map((s) => s.stepId).join('|');
      expect(ids).toContain('month3-shortcuts');
      expect(ids).toContain('month3-batch');
    }
  });

  it('超过 90 天返回空数组——真帮人不能烦人', () => {
    for (const days of [91, 120, 365, 9999]) {
      expect(buildOnboardingGuide('doctor', days)).toEqual([]);
      expect(buildOnboardingGuide('nurse', days)).toEqual([]);
    }
  });

  it('负数 / NaN / 非数字入参安全兜底，不抛错', () => {
    expect(() => buildOnboardingGuide('doctor', -5)).not.toThrow();
    expect(() => buildOnboardingGuide('doctor', NaN)).not.toThrow();
    expect(buildOnboardingGuide('doctor', -5).every((s) => s.stage === 'day1')).toBe(true);
  });

  it('护士/药师/管理员 week1 文案与医生不同（角色差异化）', () => {
    const doc = buildOnboardingGuide('doctor', 3).map((s) => s.title).join('|');
    const nur = buildOnboardingGuide('nurse', 3).map((s) => s.title).join('|');
    const pha = buildOnboardingGuide('pharmacist', 3).map((s) => s.title).join('|');
    const adm = buildOnboardingGuide('admin', 3).map((s) => s.title).join('|');
    expect(doc).not.toBe(nur);
    expect(nur).not.toBe(pha);
    expect(pha).not.toBe(adm);
    expect(nur).toContain('护理');
    expect(pha).toContain('处方');
    expect(adm).toContain('权限');
  });

  it('每步都有可跳转 target、可跳过/不再提示标记', () => {
    for (const days of [0, 3, 15, 60]) {
      for (const s of buildOnboardingGuide('doctor', days)) {
        expect(s.stepId.length).toBeGreaterThan(0);
        expect(s.target.startsWith('/')).toBe(true);
        expect(typeof s.skippable).toBe('boolean');
        expect(typeof s.dismissable).toBe('boolean');
      }
    }
  });

  it('与 M134-A 重载共存：(staffId, role) 仍返回完整 Guide', () => {
    const guide = buildOnboardingGuide('staff-001', 'doctor');
    expect(Array.isArray((guide as { stages?: unknown }).stages)).toBe(true);
    expect((guide as { stages: unknown[] }).stages.length).toBe(4);
  });
});

describe('M155-D 快捷键 getShortcuts(role, page)', () => {
  it('全员快捷键：Ctrl+K / Ctrl+/ / Esc 在所有页面都返回', () => {
    for (const role of ['doctor', 'nurse', 'pharmacist', 'admin']) {
      for (const page of ['all', 'workbench', 'order', 'emr']) {
        const list = getShortcuts(role, page);
        const keys = list.map((s) => s.key);
        expect(keys).toContain('Ctrl+K');
        expect(keys).toContain('Ctrl+/');
        expect(keys).toContain('Esc');
      }
    }
  });

  it('医生在医嘱页拿到 Ctrl+S / Ctrl+Enter，但护士在医嘱页不会拿到医生专属快捷键', () => {
    const docOrder = getShortcuts('doctor', 'order').map((s) => s.key);
    expect(docOrder).toContain('Ctrl+S');
    expect(docOrder).toContain('Ctrl+Enter');
    const nurNursing = getShortcuts('nurse', 'nursing').map((s) => s.key);
    expect(nurNursing).toContain('Ctrl+S');
    expect(nurNursing).toContain('Ctrl+Enter');
    // 护士在医嘱页：只拿得到 3 个全员快捷键，不应出现医生专属的「保存医嘱/提交医嘱」
    const nurOrder = getShortcuts('nurse', 'order');
    expect(nurOrder.map((s) => s.key)).toEqual(['Ctrl+K', 'Ctrl+/', 'Esc']);
    expect(nurOrder.some((s) => s.when === 'doctor')).toBe(false);
  });

  it('page=all 返回该角色全部可用快捷键', () => {
    const all = getShortcuts('doctor', 'all');
    expect(all.length).toBeGreaterThan(3);
    // 包含 order/emr/prescription 各页
    expect(all.map((s) => s.page)).toEqual(
      expect.arrayContaining(['order', 'emr', 'prescription', 'all']),
    );
  });

  it('未知角色回落 doctor，不抛错', () => {
    expect(() => getShortcuts('wizard', 'all')).not.toThrow();
    expect(getShortcuts('wizard', 'all').length).toBeGreaterThan(0);
  });
});

describe('M155-D 首页个性化 personalizeHomepage(userId, role)', () => {
  it('返回欢迎语、Widget 列表与工作台快捷键', () => {
    const cfg = personalizeHomepage('u-001', 'doctor');
    expect(cfg.userId).toBe('u-001');
    expect(cfg.role).toBe('doctor');
    expect(cfg.roleLabel).toBe('医生');
    expect(cfg.welcome).toContain('医生');
    expect(cfg.widgets.length).toBeGreaterThanOrEqual(4);
    expect(cfg.shortcuts.length).toBeGreaterThan(0);
    expect(cfg.showGuide).toBe(true);
    expect(cfg.dismissedStages).toEqual([]);
  });

  it('Widget 已按 order 升序排列，且医生/护士卡片不同', () => {
    const doc = personalizeHomepage('u1', 'doctor');
    const nur = personalizeHomepage('u2', 'nurse');
    const orders = doc.widgets.map((w) => w.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(doc.widgets.map((w) => w.key)).toContain('todayOrders');
    expect(nur.widgets.map((w) => w.key)).toContain('nursingTasks');
  });

  it('纯函数：同一入参两次调用结果完全一致', () => {
    const a = personalizeHomepage('u-det', 'pharmacist');
    const b = personalizeHomepage('u-det', 'pharmacist');
    expect(a).toEqual(b);
  });
});

describe('M155-D 标记完成 recordOnboardingProgress(userId, step)', () => {
  it('完成 day1 一步后，day1 阶段 completed +1（封顶 total），百分比上升', () => {
    const before = recordOnboardingProgress('staff-rec-1', 'unknown-step');
    const after = recordOnboardingProgress('staff-rec-1', 'day1-login');
    const day1Before = before.stages.find((s) => s.stageKey === 'day1')!;
    const day1After = after.stages.find((s) => s.stageKey === 'day1')!;
    // day1 在 M134-A 推演里本就全完成，封顶后仍等于 total
    expect(day1After.completed).toBe(day1Before.completed);
    expect(day1After.completed).toBeLessThanOrEqual(day1After.total);
  });

  it('完成 week1 一步后，week1 阶段 completed 增加且不超过 total', () => {
    const before = recordOnboardingProgress('staff-rec-2', 'x');
    const after = recordOnboardingProgress('staff-rec-2', 'week1-order');
    const wb = before.stages.find((s) => s.stageKey === 'week1')!;
    const wa = after.stages.find((s) => s.stageKey === 'week1')!;
    expect(wa.completed).toBe(Math.min(wb.total, wb.completed + 1));
    expect(after.percent).toBeGreaterThanOrEqual(before.percent);
  });

  it('未知 stepId 原样返回，不抛错', () => {
    const p = recordOnboardingProgress('staff-rec-3', '');
    expect(p.staffId).toBe('staff-rec-3');
    expect(p.stages.length).toBe(4);
    expect(() => recordOnboardingProgress('staff-rec-3', 'not-a-step')).not.toThrow();
  });

  it('智慧度当前值封顶 100', () => {
    const p = recordOnboardingProgress('staff-rec-4', 'month3-batch');
    expect(p.wisdomCurrent).toBeLessThanOrEqual(100);
    expect(p.wisdomCurrent).toBeGreaterThanOrEqual(p.wisdomBaseline);
  });
});

