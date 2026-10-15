/**
 * 健澜科技 jlmedaios - M137-D 关键业务流程 E2E 纯函数单元测试【测试覆盖率冲刺 · 生产就绪质量门禁】
 *
 * 覆盖：
 *  - 流程注册表：四条关键主链路（门诊 / 住院 / 处方审核 / Personal Agent）齐全、
 *    步骤顺序与业务一致、同流程步骤 key 唯一；
 *  - runE2ETestFlow：默认执行器下每条流程全绿（每条流程至少 1 个通过用例）、
 *    步骤计数与累计耗时正确、未知流程返回红灯结果；
 *  - 注入执行器：某步失败 → 流程判红、passedSteps/failedSteps 正确；
 *  - generateE2EReport：流程级 / 步骤级通过率、红项明细、门禁结论 ok。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ALL_E2E_FLOW_NAMES,
  E2E_FLOW_REGISTRY,
  findFlow,
  generateE2EReport,
  runE2ETestFlow,
  simulatedUserRunner,
  type E2EResult,
  type E2EStepRunner,
} from '../../src/bff/aggregators/e2eTestAggregator.js';
import { e2eTestRoutes } from '../../src/bff/routes/e2eTest.js';

/* ===================== 流程注册表 ===================== */

describe('E2E_FLOW_REGISTRY 四条关键主链路齐全', () => {
  it('包含门诊 / 住院 / 处方审核 / Personal Agent 四条流程', () => {
    const names = E2E_FLOW_REGISTRY.map((f) => f.name);
    expect(names).toContain('outpatient');
    expect(names).toContain('inpatient');
    expect(names).toContain('prescriptionReview');
    expect(names).toContain('personalAgent');
  });

  it('ALL_E2E_FLOW_NAMES 与注册表一一对应', () => {
    expect(ALL_E2E_FLOW_NAMES).toHaveLength(E2E_FLOW_REGISTRY.length);
    expect(ALL_E2E_FLOW_NAMES).toEqual(E2E_FLOW_REGISTRY.map((f) => f.name));
  });

  it('每条流程步骤 key 在同流程内唯一', () => {
    for (const flow of E2E_FLOW_REGISTRY) {
      const keys = flow.steps.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('门诊链路步骤顺序为 挂号→看诊→开方→取药→随访', () => {
    const flow = findFlow('outpatient');
    expect(flow?.steps.map((s) => s.key)).toEqual([
      'register',
      'consult',
      'prescribe',
      'dispense',
      'followup',
    ]);
  });

  it('住院链路步骤顺序为 入院→医嘱→护理→出院', () => {
    expect(findFlow('inpatient')?.steps.map((s) => s.key)).toEqual([
      'admit',
      'orders',
      'nursing',
      'discharge',
    ]);
  });

  it('处方审核链路步骤顺序为 开方→审方→发药', () => {
    expect(findFlow('prescriptionReview')?.steps.map((s) => s.key)).toEqual([
      'prescribe',
      'review',
      'dispense',
    ]);
  });

  it('Personal Agent 链路步骤顺序为 登录→看推荐→记录经验→查看成长', () => {
    expect(findFlow('personalAgent')?.steps.map((s) => s.key)).toEqual([
      'login',
      'recommend',
      'recordExperience',
      'viewGrowth',
    ]);
  });
});

/* ===================== runE2ETestFlow：每条流程至少 1 个通过用例 ===================== */

describe('runE2ETestFlow 每条关键流程默认执行全绿', () => {
  it('患者就诊（5 步）全绿通过', () => {
    const r = runE2ETestFlow('outpatient');
    expect(r.ok).toBe(true);
    expect(r.totalSteps).toBe(5);
    expect(r.passedSteps).toBe(5);
    expect(r.failedSteps).toBe(0);
  });

  it('住院（4 步）全绿通过', () => {
    const r = runE2ETestFlow('inpatient');
    expect(r.ok).toBe(true);
    expect(r.totalSteps).toBe(4);
    expect(r.passedSteps).toBe(4);
  });

  it('处方审核（3 步）全绿通过', () => {
    const r = runE2ETestFlow('prescriptionReview');
    expect(r.ok).toBe(true);
    expect(r.totalSteps).toBe(3);
    expect(r.passedSteps).toBe(3);
  });

  it('Personal Agent（4 步）全绿通过', () => {
    const r = runE2ETestFlow('personalAgent');
    expect(r.ok).toBe(true);
    expect(r.totalSteps).toBe(4);
    expect(r.passedSteps).toBe(4);
  });

  it('逐步骤回带角色、动作与成功回执，且保持业务顺序', () => {
    const r = runE2ETestFlow('outpatient');
    expect(r.steps[0].label).toBe('挂号');
    expect(r.steps[0].actor).toBe('患者');
    expect(r.steps[0].note).toContain('操作成功');
    expect(r.steps[4].label).toBe('随访');
  });

  it('累计耗时为各步耗时之和（确定性递增）', () => {
    // 默认执行器 elapsedMs = 20 + index*7；门诊 5 步 => 20+27+34+41+48 = 170
    const r = runE2ETestFlow('outpatient');
    expect(r.elapsedMs).toBe(170);
    expect(r.steps.reduce((acc, s) => acc + s.elapsedMs, 0)).toBe(r.elapsedMs);
  });

  it('simulatedUserRunner 默认每步 ok=true', () => {
    expect(simulatedUserRunner({ key: 'a', label: 'x', actor: 'y', action: 'z' }, 0).ok).toBe(true);
  });
});

describe('runE2ETestFlow 异常与注入执行器', () => {
  it('未知流程返回红灯结果且不抛异常', () => {
    const r = runE2ETestFlow('not-a-flow');
    expect(r.ok).toBe(false);
    expect(r.label).toBe('未注册流程');
    expect(r.note).toContain('not-a-flow');
    expect(r.steps).toEqual([]);
  });

  it('注入故障执行器：某步失败 → 流程判红，passed/failed 计数正确', () => {
    // 让「审方」这一步失败
    const flaky: E2EStepRunner = (step) =>
      step.key === 'review'
        ? { ok: false, elapsedMs: 12, note: '处方存在相互作用，退回医生' }
        : simulatedUserRunner(step, 0);

    const r = runE2ETestFlow('prescriptionReview', flaky);
    expect(r.ok).toBe(false);
    expect(r.totalSteps).toBe(3);
    expect(r.passedSteps).toBe(2);
    expect(r.failedSteps).toBe(1);
    expect(r.steps[1].ok).toBe(false);
    expect(r.steps[1].note).toContain('退回');
  });

  it('注入执行器可自定义耗时，红灯步 note 原样回带', () => {
    const slow: E2EStepRunner = () => ({ ok: true, elapsedMs: 99, note: 'ok' });
    const r = runE2ETestFlow('personalAgent', slow);
    expect(r.elapsedMs).toBe(99 * 4);
    expect(r.ok).toBe(true);
  });
});

/* ===================== generateE2EReport 报告生成 ===================== */

describe('generateE2EReport 红绿报告聚合', () => {
  it('空清单：全率为 1、ok=true、各项归零', () => {
    const report = generateE2EReport([], { generatedAt: '2026-10-16T00:00:00Z' });
    expect(report).toMatchObject({
      generatedAt: '2026-10-16T00:00:00Z',
      totalFlows: 0,
      passedFlows: 0,
      failedFlows: 0,
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      flowPassRate: 1,
      stepPassRate: 1,
      ok: true,
      avgFlowElapsedMs: 0,
      failures: [],
    });
  });

  it('四条流程默认全绿 → 报告 ok=true、红项为空', () => {
    const results = ALL_E2E_FLOW_NAMES.map((n) => runE2ETestFlow(n));
    const report = generateE2EReport(results);
    expect(report.totalFlows).toBe(4);
    expect(report.passedFlows).toBe(4);
    expect(report.failedFlows).toBe(0);
    expect(report.flowPassRate).toBe(1);
    expect(report.stepPassRate).toBe(1);
    expect(report.ok).toBe(true);
    expect(report.failures).toEqual([]);
    // 总步数 = 5 + 4 + 3 + 4 = 16
    expect(report.totalSteps).toBe(16);
    expect(report.passedSteps).toBe(16);
  });

  it('混入一条红流程 → 通过率折算且红项明细可见', () => {
    const green = runE2ETestFlow('outpatient');
    const red: E2EResult = {
      ...runE2ETestFlow('prescriptionReview'),
      ok: false,
      failedSteps: 1,
      passedSteps: 2,
      note: '审方失败',
    };
    const report = generateE2EReport([green, red]);
    expect(report.totalFlows).toBe(2);
    expect(report.passedFlows).toBe(1);
    expect(report.failedFlows).toBe(1);
    expect(report.flowPassRate).toBe(0.5);
    expect(report.ok).toBe(false);
    expect(report.failures[0].flowName).toBe('prescriptionReview');
  });

  it('avgFlowElapsedMs 为各流程耗时的算术平均', () => {
    const a = runE2ETestFlow('outpatient'); // 170
    const b = runE2ETestFlow('inpatient'); // 20+27+34+41=122
    const report = generateE2EReport([a, b]);
    expect(report.avgFlowElapsedMs).toBe(Math.round((170 + 122) / 2));
  });

  it('results 原样回带且保持入参顺序', () => {
    const results = [runE2ETestFlow('personalAgent'), runE2ETestFlow('inpatient')];
    const report = generateE2EReport(results);
    expect(report.results.map((r) => r.flowName)).toEqual(['personalAgent', 'inpatient']);
  });
});

/* ===================== 路由登记 ===================== */

describe('e2eTestRoutes 路由登记', () => {
  it('登记了 GET /api/v1/admin/test/e2e 且要求登录', () => {
    const def = e2eTestRoutes.find((r) => r.path === '/api/v1/admin/test/e2e');
    expect(def).toBeDefined();
    expect(def?.method).toBe('GET');
    expect(def?.auth).toBe(true);
  });
});
