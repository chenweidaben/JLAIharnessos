/**
 * 健澜科技 jlmedaios - 【安全质量与运营】医院应急管理深化纯函数单测
 *
 * 覆盖：十类预案库（buildDeepEmergencySystem 十情景齐全/指挥动作不空泛）、
 *       风险评估（calculateEmergencyRisk 高占用高脆弱→高危、建议触发）、
 *       演练排期（optimizeEmergencyDrillSchedule 风险分级周期/不及格加密/逾期优先）、
 *       物资跟踪（trackEmergencySupply 库存缺口/30天到期/已过期三态）、
 *       响应自动化（evaluateEmergencyTrigger 命中通知链与自动启动、不命中不响应）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepEmergencySystem,
  calculateEmergencyRisk,
  evaluateEmergencyTrigger,
  optimizeEmergencyDrillSchedule,
  trackEmergencySupply,
  type DeptRiskContext,
  type EmergencySupplyItem,
  type ResponseRule,
} from '../../src/bff/aggregators/emergencyDeepAggregator';

const RISK_CTX: DeptRiskContext = {
  occupancy: 0.9,
  vulnerableRatio: 0.3,
  lastDrillScore: 80,
  supplyGapRatio: 0.1,
};

function supply(over: Partial<EmergencySupplyItem>): EmergencySupplyItem {
  return {
    itemCode: 'X-001',
    itemName: '测试物资',
    location: '库房',
    scenario: 'fire',
    requiredQty: 10,
    currentQty: 10,
    unit: '件',
    expiryDate: null,
    ...over,
  };
}

describe('深度应急体系 buildDeepEmergencySystem', () => {
  it('十类情景预案齐全', () => {
    const sys = buildDeepEmergencySystem();
    const expected = [
      'cardiac_arrest', 'earthquake', 'fire', 'hazmat_spill', 'it_failure',
      'mass_casualty', 'outbreak', 'power_outage', 'terror_attack', 'water_outage',
    ];
    const codes = sys.map((p) => p.scenario as string).sort();
    expect(codes).toEqual([...expected].sort());
    expect(sys).toHaveLength(10);
  });

  it('每套预案动作/物资/通报不空泛——真能用', () => {
    for (const p of buildDeepEmergencySystem()) {
      expect(p.actions.length).toBeGreaterThanOrEqual(3);
      expect(p.resources.length).toBeGreaterThanOrEqual(1);
      expect(p.communication.length).toBeGreaterThanOrEqual(1);
      expect(p.command.chief.length).toBeGreaterThan(0);
      expect(p.drillIntervalDays).toBeGreaterThan(0);
    }
  });
});

describe('应急风险评估 calculateEmergencyRisk', () => {
  it('高占用+高脆弱+演练差→高危', () => {
    const r = calculateEmergencyRisk('fire', {
      occupancy: 1,
      vulnerableRatio: 1,
      lastDrillScore: 30,
      supplyGapRatio: 0.5,
    });
    expect(r.level).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('低占用+演练优秀+物资充足→低危', () => {
    const r = calculateEmergencyRisk('water_outage', {
      occupancy: 0.2,
      vulnerableRatio: 0.05,
      lastDrillScore: 100,
      supplyGapRatio: 0,
    });
    expect(r.level).toBe('low');
    expect(r.score).toBeLessThan(40);
  });

  it('分数截在 0~100', () => {
    const r = calculateEmergencyRisk('mass_casualty', RISK_CTX);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('演练排期 optimizeEmergencyDrillSchedule', () => {
  const plans = buildDeepEmergencySystem();

  it('上次不及格自动加密周期', () => {
    const sched = optimizeEmergencyDrillSchedule(
      plans,
      { power_outage: { date: '2026-01-01', score: 60 } },
      '2026-10-16',
    );
    const po = sched.find((s) => s.scenario === 'power_outage');
    expect(po?.accelerated).toBe(true);
  });

  it('从未演练的排最前（视同逾期）', () => {
    const sched = optimizeEmergencyDrillSchedule(
      plans,
      { fire: { date: '2026-09-01', score: 90 } },
      '2026-10-16',
    );
    // 除 fire 外全部从未演练 → 第一条应为某个未演练情景
    expect(sched[0].scenario).not.toBe('fire');
  });
});

describe('应急物资跟踪 trackEmergencySupply', () => {
  it('库存低于定额 → low_stock', () => {
    const r = trackEmergencySupply([supply({ currentQty: 3, requiredQty: 10, expiryDate: null })], '2026-10-16');
    expect(r.items[0].status).toBe('low_stock');
    expect(r.lowStockCount).toBe(1);
  });

  it('30 天内到期 → expiring_soon', () => {
    const r = trackEmergencySupply([supply({ expiryDate: '2026-11-01' })], '2026-10-16');
    expect(r.items[0].status).toBe('expiring_soon');
  });

  it('已过期 → expired', () => {
    const r = trackEmergencySupply([supply({ expiryDate: '2026-09-01' })], '2026-10-16');
    expect(r.items[0].status).toBe('expired');
  });

  it('库存充足且未到期 → ok', () => {
    const r = trackEmergencySupply([supply({ currentQty: 10, requiredQty: 10, expiryDate: '2027-01-01' })], '2026-10-16');
    expect(r.items[0].status).toBe('ok');
    expect(r.okCount).toBe(1);
  });
});

describe('响应自动化 evaluateEmergencyTrigger', () => {
  const rules: ResponseRule[] = [
    {
      ruleCode: 'RULE-FIRE',
      scenario: 'fire',
      when: { alarm: true },
      notify: [{ role: '值班院领导', channel: '电话', withinMin: 1 }],
      autoActions: ['启动火灾疏散预案'],
    },
    {
      ruleCode: 'RULE-IT',
      scenario: 'it_failure',
      when: { offline: true },
      notify: [{ role: '信息中心', channel: '电话', withinMin: 5 }],
      autoActions: ['切换纸质应急诊疗'],
    },
  ];

  it('命中火灾信号 → 输出通知链与自动启动动作', () => {
    const m = evaluateEmergencyTrigger({ source: 'panel', values: { alarm: true, zone: 'B' } }, rules);
    expect(m).toHaveLength(1);
    expect(m[0].ruleCode).toBe('RULE-FIRE');
    expect(m[0].notifications[0].withinMin).toBeLessThanOrEqual(1);
    expect(m[0].autoActions).toContain('启动火灾疏散预案');
  });

  it('信号不满足触发条件 → 不响应（不误启动）', () => {
    const m = evaluateEmergencyTrigger({ source: 'panel', values: { alarm: false } }, rules);
    expect(m).toHaveLength(0);
  });

  it('多规则同时命中可并行', () => {
    const rules2: ResponseRule[] = [
      ...rules,
      {
        ruleCode: 'RULE-BOTH',
        scenario: 'it_failure',
        when: { alarm: true },
        notify: [],
        autoActions: ['广播'],
      },
    ];
    const m = evaluateEmergencyTrigger({ source: 'x', values: { alarm: true } }, rules2);
    expect(m.length).toBeGreaterThanOrEqual(2);
  });
});
