/**
 * 健澜科技 jlmedaios - M128-B 移动端快捷操作纯函数单测
 * 覆盖：角色判断、操作列表、权限控制。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMobileQuickActions,
  STAFF_ROLES,
} from '../../src/bff/aggregators/mobileQuickActionsAggregator';

describe('buildMobileQuickActions - 角色判断', () => {
  it('医生/护士/药师均能返回非空列表', () => {
    for (const role of STAFF_ROLES) {
      const list = buildMobileQuickActions(role, ['rx:review']);
      expect(list.length).toBeGreaterThan(0);
    }
  });

  it('未知角色 / 空角色 / null 返回空数组（越权不下发任何操作）', () => {
    expect(buildMobileQuickActions('admin')).toEqual([]);
    expect(buildMobileQuickActions('patient')).toEqual([]);
    expect(buildMobileQuickActions('')).toEqual([]);
    expect(buildMobileQuickActions(null)).toEqual([]);
    expect(buildMobileQuickActions(undefined)).toEqual([]);
  });
});

describe('buildMobileQuickActions - 操作列表', () => {
  it('医生返回 4 项：今日门诊/待处理医嘱/处方审核/病历补全', () => {
    const list = buildMobileQuickActions('doctor', ['rx:review']);
    expect(list.map((a) => a.label)).toEqual([
      '今日门诊',
      '待处理医嘱',
      '处方审核',
      '病历补全',
    ]);
  });

  it('护士返回 3 项：今日交班/风险患者/待执行护理', () => {
    const list = buildMobileQuickActions('nurse');
    expect(list.map((a) => a.label)).toEqual(['今日交班', '风险患者', '待执行护理']);
  });

  it('药师返回 2 项：待审处方/拦截记录', () => {
    const list = buildMobileQuickActions('pharmacist');
    expect(list.map((a) => a.label)).toEqual(['待审处方', '拦截记录']);
  });

  it('每个操作均具备 key/icon/target/desc，可被前端直接渲染', () => {
    for (const a of buildMobileQuickActions('doctor', ['rx:review'])) {
      expect(a.key.length).toBeGreaterThan(0);
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.target.startsWith('/')).toBe(true);
    }
  });

  it('各角色操作互不串台：护士列表不含医生操作', () => {
    const nurse = buildMobileQuickActions('nurse').map((a) => a.key);
    expect(nurse).not.toContain('today-opd');
    expect(nurse).not.toContain('rx-review');
  });
});

describe('buildMobileQuickActions - 权限控制', () => {
  it('医生缺少 rx:review 权限时，不下发「处方审核」', () => {
    const list = buildMobileQuickActions('doctor', []);
    expect(list.map((a) => a.key)).not.toContain('rx-review');
    expect(list).toHaveLength(3);
  });

  it('医生授予 rx:review 权限后，下发「处方审核」', () => {
    const list = buildMobileQuickActions('doctor', ['rx:review']);
    expect(list.map((a) => a.key)).toContain('rx-review');
    expect(list).toHaveLength(4);
  });

  it('未传 permissions 参数时，需权限操作默认不下发（安全侧默认拒绝）', () => {
    const list = buildMobileQuickActions('doctor');
    expect(list.map((a) => a.key)).not.toContain('rx-review');
  });

  it('护士/药师操作无权限门槛，传任意权限均不影响其可见性', () => {
    expect(buildMobileQuickActions('nurse', []).length).toBe(3);
    expect(buildMobileQuickActions('pharmacist', ['whatever']).length).toBe(2);
  });
});
