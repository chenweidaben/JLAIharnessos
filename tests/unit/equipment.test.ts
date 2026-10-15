/**
 * 健澜科技 jlmedaios - 医疗设备管理纯函数单测（M139-B）【医院运营管理】
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  registerEquipment,
  scheduleMaintenance,
  getEquipmentStatusReport,
  listEquipment,
  resetEquipmentStore,
  MAINTENANCE_WINDOW_DAYS,
} from '../../src/bff/aggregators/equipmentAggregator';

beforeEach(() => resetEquipmentStore());

describe('设备登记 registerEquipment', () => {
  it('登记后默认状态为「在用」、尚未排程维护', () => {
    const eq = registerEquipment('CT 扫描仪', 'Revolution-256', '放射科', '2024-03-01', 12_000_000);
    expect(eq.id).toBe('eq_0001');
    expect(eq.name).toBe('CT 扫描仪');
    expect(eq.model).toBe('Revolution-256');
    expect(eq.dept).toBe('放射科');
    expect(eq.purchaseDate).toBe('2024-03-01');
    expect(eq.value).toBe(12_000_000);
    expect(eq.status).toBe('在用');
    expect(eq.nextMaintenanceDate).toBeNull();
  });

  it('id 按顺序确定性递增', () => {
    const a = registerEquipment('A', 'm', 'd', '2024-01-01', 100);
    const b = registerEquipment('B', 'm', 'd', '2024-01-01', 100);
    expect(a.id).toBe('eq_0001');
    expect(b.id).toBe('eq_0002');
  });

  it('名称为空 / 日期非法 / 原值为负时抛错', () => {
    expect(() => registerEquipment('  ', 'm', 'd', '2024-01-01', 1)).toThrow();
    expect(() => registerEquipment('X', 'm', 'd', '2024/01/01', 1)).toThrow();
    expect(() => registerEquipment('X', 'm', 'd', '2024-01-01', -5)).toThrow();
  });
});

describe('维护计划 scheduleMaintenance', () => {
  it('排程后生成流水并回写设备下次维护日', () => {
    const eq = registerEquipment('监护仪', 'VM-6', 'ICU', '2023-06-01', 50_000);
    const rec = scheduleMaintenance(eq.id, '2026-11-01');
    expect(rec.id).toBe('mt_0001');
    expect(rec.equipmentId).toBe(eq.id);
    expect(rec.nextDate).toBe('2026-11-01');
    expect(listEquipment().find((e) => e.id === eq.id)?.nextMaintenanceDate).toBe('2026-11-01');
  });

  it('设备不存在时抛错', () => {
    expect(() => scheduleMaintenance('eq_9999', '2026-11-01')).toThrow(/设备不存在/);
  });

  it('日期格式非法时抛错', () => {
    const eq = registerEquipment('X', 'm', 'd', '2024-01-01', 1);
    expect(() => scheduleMaintenance(eq.id, '11-01')).toThrow(/日期格式非法/);
  });
});

describe('状态统计 getEquipmentStatusReport', () => {
  it('空台账安全兜底，不除零', () => {
    const rpt = getEquipmentStatusReport(new Date('2026-10-16T00:00:00'));
    expect(rpt.total).toBe(0);
    expect(rpt.byStatus['在用']).toBe(0);
    expect(rpt.totalValue).toBe(0);
    expect(rpt.maintenanceAlerts).toEqual([]);
  });

  it('按四态统计数量与资产原值合计', () => {
    registerEquipment('CT', 'm', '放射科', '2024-01-01', 1_000_000);
    registerEquipment('X光机', 'm', '放射科', '2024-01-01', 200_000);
    const rpt = getEquipmentStatusReport(new Date('2026-10-16T00:00:00'));
    expect(rpt.total).toBe(2);
    expect(rpt.byStatus['在用']).toBe(2);
    expect(rpt.totalValue).toBe(1_200_000);
  });

  it('提前提醒：已逾期进入 overdue，窗口内进入 due-soon，窗口外不提醒', () => {
    // 今天 2026-10-16
    const now = new Date('2026-10-16T00:00:00');
    const overdue = registerEquipment('CT', 'm', '放射科', '2024-01-01', 1);
    scheduleMaintenance(overdue.id, '2026-10-10'); // 逾期 6 天
    const soon = registerEquipment('监护仪', 'm', 'ICU', '2024-01-01', 1);
    scheduleMaintenance(soon.id, '2026-10-20'); // 4 天后，窗口内
    const later = registerEquipment('输液泵', 'm', '急诊', '2024-01-01', 1);
    scheduleMaintenance(later.id, '2026-12-01'); // 远在窗口外

    const rpt = getEquipmentStatusReport(now);
    expect(rpt.overdueCount).toBe(1);
    expect(rpt.upcomingCount).toBe(1);
    // 逾期排最前
    expect(rpt.maintenanceAlerts[0].equipmentId).toBe(overdue.id);
    expect(rpt.maintenanceAlerts[0].level).toBe('overdue');
    expect(rpt.maintenanceAlerts[0].daysUntilDue).toBe(-6);
    expect(rpt.maintenanceAlerts[1].equipmentId).toBe(soon.id);
    expect(rpt.maintenanceAlerts[1].level).toBe('due-soon');
    // 窗口外的设备不进提醒清单
    expect(rpt.maintenanceAlerts.find((a) => a.equipmentId === later.id)).toBeUndefined();
  });

  it('默认提前窗口为 7 天', () => {
    expect(MAINTENANCE_WINDOW_DAYS).toBe(7);
  });
});
