/**
 * 健澜科技 jlmedaios - 【互联网医院深化】处方流转与药品配送纯函数单测（M163-D）
 *
 * 覆盖：
 *  - buildOnlineConsultationFlow：问诊七步蓝图（预约→随访）与每步合规卡口；
 *  - verifyOnlinePrescription：麻精毒放禁开 / 复诊二次方须药师审方 / 处方状态；
 *  - routePrescriptionToPharmacy：合规通过就近选双证药房、违规即阻断；
 *  - trackDelivery：配送链路回读（建单→打包→发货→送达/取药）。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildOnlineConsultationFlow,
  routePrescriptionToPharmacy,
  trackDelivery,
  verifyOnlinePrescription,
} from '../../src/bff/aggregators/internetHospitalAggregator';

/** 武林广场附近（与前端默认定位一致） */
const WULIN = { lng: 120.16, lat: 30.275 };

describe('buildOnlineConsultationFlow 问诊七步流程蓝图', () => {
  it('固定七步，顺序为 预约→接诊→问诊→开方→流转→配送→随访', () => {
    const flow = buildOnlineConsultationFlow();
    expect(flow.steps).toHaveLength(7);
    expect(flow.stages).toEqual([
      'appointment',
      'doctor_accept',
      'online_consult',
      'prescribe',
      'prescription_route',
      'drug_delivery',
      'followup',
    ]);
  });

  it('每一步都带合规卡口说明（安全与运营）', () => {
    const { steps } = buildOnlineConsultationFlow();
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i]!.order).toBe(i + 1);
      expect(steps[i]!.complianceGate.length).toBeGreaterThan(0);
    }
    // 处方流转步明确“复诊二次方须审方”
    const routeStep = steps.find((s) => s.key === 'prescription_route')!;
    expect(routeStep.complianceGate).toContain('复诊二次方');
  });
});

describe('verifyOnlinePrescription 合规复核', () => {
  it('普通已审方处方：合规通过', () => {
    const v = verifyOnlinePrescription('rx-seed-001');
    expect(v.compliant).toBe(true);
    expect(v.requiresPharmacistReview).toBe(false);
    expect(v.blockers).toHaveLength(0);
  });

  it('复诊二次方且已审方通过：合规通过，标记需药师审方', () => {
    const v = verifyOnlinePrescription('rx-seed-002');
    expect(v.compliant).toBe(true);
    expect(v.requiresPharmacistReview).toBe(true);
  });

  it('含麻醉药品（禁开）：直接阻断', () => {
    const v = verifyOnlinePrescription('rx-seed-003');
    expect(v.compliant).toBe(false);
    expect(v.blockers.join()).toContain('麻醉');
    const banCheck = v.checks.find((c) => c.name === '禁开特殊药品')!;
    expect(banCheck.pass).toBe(false);
  });

  it('复诊二次方但未审方：阻断', () => {
    const v = verifyOnlinePrescription('rx-seed-004');
    expect(v.compliant).toBe(false);
    expect(v.blockers.join()).toContain('审方');
  });

  it('处方不存在：抛错', () => {
    expect(() => verifyOnlinePrescription('rx-not-exist')).toThrow(/不存在/);
  });
});

describe('routePrescriptionToPharmacy 处方流转', () => {
  it('合规处方在武林广场：流转至最近的武林总店（约 0.6km，到店自取）', () => {
    const d = routePrescriptionToPharmacy('rx-seed-001', WULIN);
    expect(d.routed).toBe(true);
    expect(d.pharmacyId).toBe('PH-CITY-HQ');
    expect(d.distanceKm!).toBeLessThan(1);
    expect(d.channel).toBe('self_pick'); // 2km 内可自取
    expect(d.etaMinutes!).toBeGreaterThan(0);
  });

  it('复诊二次方已审方：可流转，且带二次方提示', () => {
    const d = routePrescriptionToPharmacy('rx-seed-002', WULIN);
    expect(d.routed).toBe(true);
    expect(d.warnings.join()).toContain('二次方');
  });

  it('含麻醉药品：不流转（合规阻断，禁止违规售药）', () => {
    const d = routePrescriptionToPharmacy('rx-seed-003', WULIN);
    expect(d.routed).toBe(false);
    expect(d.pharmacyId).toBeNull();
    expect(d.reason).toContain('合规');
  });

  it('二次方未审方：不流转', () => {
    const d = routePrescriptionToPharmacy('rx-seed-004', WULIN);
    expect(d.routed).toBe(false);
  });

  it('定位超出所有服务半径：不流转（不强行派单）', () => {
    // 远郊，距最近药房远超半径
    const d = routePrescriptionToPharmacy('rx-seed-001', { lng: 120.9, lat: 30.9 });
    expect(d.routed).toBe(false);
    expect(d.reason).toContain('服务半径');
  });

  it('非法经纬度：抛错', () => {
    expect(() =>
      routePrescriptionToPharmacy('rx-seed-001', { lng: NaN, lat: 30 }),
    ).toThrow(/经纬度/);
  });
});

describe('trackDelivery 药品配送追踪', () => {
  it('rx-seed-001：已发货，链路含 建单→打包→发货 三节点', () => {
    const t = trackDelivery('rx-seed-001');
    expect(t.currentStage).toBe('shipped');
    expect(t.finished).toBe(false);
    expect(t.timeline).toHaveLength(3);
    expect(t.courierCompany).toBeTruthy();
    expect(t.trackingNo).toMatch(/^JL/);
  });

  it('rx-seed-002：到店自取已核销，finished=true', () => {
    const t = trackDelivery('rx-seed-002');
    expect(t.channel).toBe('self_pick');
    expect(t.currentStage).toBe('picked_up');
    expect(t.finished).toBe(true);
  });

  it('处方存在但尚未建配送单：抛错', () => {
    expect(() => trackDelivery('rx-seed-003')).toThrow(/尚未生成配送单/);
  });

  it('处方不存在：抛错', () => {
    expect(() => trackDelivery('rx-not-exist')).toThrow(/不存在/);
  });
});
