/**
 * 健澜科技 jlmedaios - M134-D 工作台待办聚合纯函数单测
 * 覆盖：角色聚合、角色差异、紧急度优先级排序、staffId 透传与计数稳定性。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildTodoList, STAFF_ROLES } from '../../src/bff/aggregators/todoAggregator';

describe('buildTodoList - 角色聚合', () => {
  it('医生/护士/药师均能返回非空待办列表', () => {
    for (const role of STAFF_ROLES) {
      expect(buildTodoList('staff-001', role).length).toBeGreaterThan(0);
    }
  });

  it('医生返回 4 项：今日门诊/待写病历/待审处方/随访提醒', () => {
    const list = buildTodoList('staff-doc', 'doctor');
    expect(list.map((t) => t.title)).toEqual([
      '今日门诊',
      '待写病历',
      '待审处方',
      '随访提醒',
    ]);
  });

  it('护士返回 3 项：交班/风险患者/待执行医嘱', () => {
    const list = buildTodoList('staff-nurse', 'nurse');
    expect(list.map((t) => t.title)).toEqual(['今日交班', '风险患者', '待执行医嘱']);
  });

  it('药师返回 2 项：待审处方/拦截处理', () => {
    const list = buildTodoList('staff-pharm', 'pharmacist');
    expect(list.map((t) => t.title)).toEqual(['待审处方', '拦截处理']);
  });

  it('未知角色 / 空角色 / null 返回空数组（越权不下发任何待办）', () => {
    expect(buildTodoList('staff-1', 'admin')).toEqual([]);
    expect(buildTodoList('staff-1', 'patient')).toEqual([]);
    expect(buildTodoList('staff-1', '')).toEqual([]);
    expect(buildTodoList('staff-1', null)).toEqual([]);
    expect(buildTodoList('staff-1', undefined)).toEqual([]);
  });
});

describe('buildTodoList - 角色差异（互不串台）', () => {
  it('护士待办不含医生业务（门诊/病历/随访）', () => {
    const nurse = buildTodoList('n', 'nurse').map((t) => t.id);
    expect(nurse).not.toContain('today-opd');
    expect(nurse).not.toContain('pending-charts');
    expect(nurse).not.toContain('followup-reminders');
  });

  it('药师待办不含医生/护士业务（门诊/病历/交班/风险患者）', () => {
    const pharm = buildTodoList('p', 'pharmacist').map((t) => t.id);
    expect(pharm).not.toContain('today-opd');
    expect(pharm).not.toContain('nurse-handover');
    expect(pharm).not.toContain('risk-patients');
  });

  it('医生与药师的「待审处方」是不同条目（id 不冲突）', () => {
    const doctor = buildTodoList('d', 'doctor').map((t) => t.id);
    const pharm = buildTodoList('p', 'pharmacist').map((t) => t.id);
    expect(doctor).toContain('pending-rx-review');
    expect(pharm).toContain('pharm-pending-rx');
    expect(pharm).not.toContain('pending-rx-review');
  });
});

describe('buildTodoList - 紧急度优先级排序（最重要在最上面）', () => {
  it('医生：urgent(今日门诊) 在 high 之前，high 在 normal(随访) 之前', () => {
    const list = buildTodoList('doc-1', 'doctor');
    const ranks = list.map((t) => t.priority);
    // urgent(0) -> high(1) -> high(1) -> normal(2)
    expect(ranks).toEqual(['urgent', 'high', 'high', 'normal']);
    expect(list[0].id).toBe('today-opd');
    expect(list[list.length - 1].id).toBe('followup-reminders');
  });

  it('护士：urgent(交班) 置顶，normal(待执行医嘱) 沉底', () => {
    const list = buildTodoList('nur-1', 'nurse');
    expect(list[0].id).toBe('nurse-handover');
    expect(list[0].priority).toBe('urgent');
    expect(list[list.length - 1].id).toBe('pending-orders');
    expect(list[list.length - 1].priority).toBe('normal');
  });

  it('药师：urgent(待审处方) 在 high(拦截处理) 之前', () => {
    const list = buildTodoList('pha-1', 'pharmacist');
    expect(list.map((t) => t.priority)).toEqual(['urgent', 'high']);
    expect(list[0].id).toBe('pharm-pending-rx');
  });

  it('排序结果对任意 staffId 保持稳定（不随计数抖动改变顺序）', () => {
    for (const sid of ['a', 'bb', 'ccc', 'staff-x-999']) {
      for (const role of STAFF_ROLES) {
        const list = buildTodoList(sid, role);
        const ranks = list.map((t) => t.priority);
        const sorted = [...ranks].sort(
          (a, b) =>
            ({ urgent: 0, high: 1, normal: 2 } as Record<string, number>)[a] -
            ({ urgent: 0, high: 1, normal: 2 } as Record<string, number>)[b],
        );
        expect(ranks).toEqual(sorted);
      }
    }
  });
});

describe('buildTodoList - 数据完整性与稳定性', () => {
  it('每条待办均具备 id/title/desc/count/priority/icon/target，可被前端直接渲染', () => {
    for (const t of buildTodoList('u-1', 'doctor')) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.desc.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.target.startsWith('/')).toBe(true);
      expect(t.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('staffId 透传到每一条待办，便于审计与多端一致', () => {
    const list = buildTodoList('staff-abc', 'doctor');
    expect(list.length).toBeGreaterThan(0);
    for (const t of list) {
      expect(t.staffId).toBe('staff-abc');
    }
  });

  it('同一 staffId 多次调用结果完全一致（纯函数、无随机抖动）', () => {
    const a = buildTodoList('stable-1', 'nurse');
    const b = buildTodoList('stable-1', 'nurse');
    expect(a).toEqual(b);
  });

  it('不同 staffId 计数可不同，但均落在合理区间且非负', () => {
    for (const t of buildTodoList('staff-x', 'doctor')) {
      expect(t.count).toBeGreaterThanOrEqual(1);
      expect(t.count).toBeLessThanOrEqual(30);
    }
  });
});
