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
  buildDeepInternetHospital,
  optimizeOnlineConsultation,
  routePrescriptionSmart,
  trackOnlinePatientJourney,
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

/* ============================================================================
 * M173-D【质量提升与新场景】医院互联网医院深化（合规·不违规售药）
 * ========================================================================== */

describe('buildDeepInternetHospital（四大深化域 + 合规 readiness）', () => {
  it('默认全量合规开启时 readiness=100、等级优秀', () => {
    const r = buildDeepInternetHospital();
    expect(r.modules.map((m) => m.code)).toEqual(['consultation', 'pharmacy', 'health', 'communication']);
    expect(r.complianceReadinessScore).toBe(100);
    expect(r.complianceLevel).toBe('excellent');
    expect(r.compliance.followupOnlyPrescription).toBe(true);
  });

  it('只开一半合规卡口时按开启占比折算（2/5=40，等级一般）', () => {
    const r = buildDeepInternetHospital({
      followupOnlyPrescription: true,
      requireESignature: true,
      requirePharmacistReview: false,
      coldChainControl: false,
      controlledSubstancePickup: false,
    });
    expect(r.complianceReadinessScore).toBe(40);
    expect(r.complianceLevel).toBe('fair');
    expect(r.summary).toContain('禁止上线售药流程');
  });
});

describe('optimizeOnlineConsultation（问诊排班：复诊优先、初诊转线下）', () => {
  const queue = [
    { patientId: 'P-INIT', visitType: 'initial' as const, channel: 'text' as const, waitedMinutes: 40, symptom: '新发胸痛' },
    { patientId: 'P-FU1', visitType: 'followup' as const, channel: 'video' as const, waitedMinutes: 5, symptom: '高血压复诊' },
    { patientId: 'P-FU2', visitType: 'followup' as const, channel: 'text' as const, waitedMinutes: 20, symptom: '糖尿病复诊' },
  ];

  it('复诊排到初诊前面，复诊内部按等待时长排序', () => {
    const r = optimizeOnlineConsultation('D-001', queue);
    expect(r.slots[0]!.patientId).toBe('P-FU2'); // 复诊且等待最久
    expect(r.slots[1]!.patientId).toBe('P-FU1');
    expect(r.slots[2]!.patientId).toBe('P-INIT'); // 初诊排最后
  });

  it('初诊一律 recommend_offline 且不可在线开方；复诊可在线开方', () => {
    const r = optimizeOnlineConsultation('D-001', queue);
    const init = r.slots.find((s) => s.patientId === 'P-INIT')!;
    expect(init.action).toBe('recommend_offline');
    expect(init.canOnlinePrescribe).toBe(false);
    const fu = r.slots.find((s) => s.patientId === 'P-FU1')!;
    expect(fu.action).toBe('accept_online');
    expect(fu.canOnlinePrescribe).toBe(true);
    expect(r.initialCount).toBe(1);
    expect(r.followupCount).toBe(2);
  });
});

describe('routePrescriptionSmart（合规先于就近、不违规售药）', () => {
  const loc = { lng: 120.16, lat: 30.275 };

  it('初诊处方直接阻断，不得在线开方', () => {
    const r = routePrescriptionSmart({
      prescriptionId: 'rx-init', patientId: 'P', doctorId: 'D',
      visitType: 'initial', esignatureRef: 'esig-1', pharmacistReview: 'approved',
      coldChain: false, controlledSubstance: false, diagnosis: '感冒',
    }, loc);
    expect(r.compliant).toBe(false);
    expect(r.routed).toBe(false);
    expect(r.warnings).toContain('初诊在线处方违规');
  });

  it('复诊但未电子签名 → 阻断', () => {
    const r = routePrescriptionSmart({
      prescriptionId: 'rx-nosig', patientId: 'P', doctorId: 'D',
      visitType: 'followup', esignatureRef: '', pharmacistReview: 'approved',
      coldChain: false, controlledSubstance: false, diagnosis: '高血压',
    }, loc);
    expect(r.compliant).toBe(false);
    expect(r.routed).toBe(false);
    expect(r.warnings).toContain('未电子签名');
  });

  it('复诊但药师未审核通过 → 阻断（无处方不卖药）', () => {
    const r = routePrescriptionSmart({
      prescriptionId: 'rx-pending', patientId: 'P', doctorId: 'D',
      visitType: 'followup', esignatureRef: 'esig-1', pharmacistReview: 'pending',
      coldChain: false, controlledSubstance: false, diagnosis: '高血压',
    }, loc);
    expect(r.compliant).toBe(false);
    expect(r.routed).toBe(false);
  });

  it('合规复诊 + 冷链 → 路由至具备冷链能力药房、冷藏配送', () => {
    const r = routePrescriptionSmart({
      prescriptionId: 'rx-cold', patientId: 'P', doctorId: 'D',
      visitType: 'followup', esignatureRef: 'esig-1', pharmacistReview: 'approved',
      coldChain: true, controlledSubstance: false, diagnosis: '糖尿病',
    }, loc);
    expect(r.compliant).toBe(true);
    expect(r.routed).toBe(true);
    expect(r.channel).toBe('refrigerated_express');
    expect(r.warnings).toContain('冷链药品已按冷藏配送路由');
  });

  it('含麻精毒放 → 只能院部中心药房自取，禁快递', () => {
    const r = routePrescriptionSmart({
      prescriptionId: 'rx-narc', patientId: 'P', doctorId: 'D',
      visitType: 'followup', esignatureRef: 'esig-1', pharmacistReview: 'approved',
      coldChain: false, controlledSubstance: true, diagnosis: '术后镇痛',
    }, loc);
    expect(r.compliant).toBe(true);
    expect(r.routed).toBe(true);
    expect(r.channel).toBe('self_pick');
    expect(r.pharmacyId).toBe('ph-hospital');
  });
});

describe('trackOnlinePatientJourney（七节点旅程与卡点定位）', () => {
  it('空输入时全部未完成，卡点为第一节点建档', () => {
    const r = trackOnlinePatientJourney('P-X');
    expect(r.total).toBe(7);
    expect(r.doneCount).toBe(0);
    expect(r.progress).toBe(0);
    expect(r.bottleneck!.step).toBe('archive');
  });

  it('完成前三个节点后，卡点定位在第四节点处方流转', () => {
    const r = trackOnlinePatientJourney('P-Y', [
      { step: 'archive', name: '在线建档', doneAt: '2026-10-10T09:00:00+08:00' },
      { step: 'consult', name: '在线问诊', doneAt: '2026-10-12T10:30:00+08:00' },
      { step: 'prescribe', name: '复诊开方', doneAt: '2026-10-12T10:45:00+08:00' },
    ]);
    expect(r.doneCount).toBe(3);
    expect(r.progress).toBe(Math.round((3 / 7) * 100));
    expect(r.bottleneck!.step).toBe('route');
  });

  it('全部完成时无卡点、progress=100', () => {
    const done = [
      'archive', 'consult', 'prescribe', 'route', 'deliver', 'followup', 'satisfaction',
    ].map((s) => ({ step: s, name: s, doneAt: '2026-10-16T00:00:00+08:00' }));
    const r = trackOnlinePatientJourney('P-Z', done);
    expect(r.bottleneck).toBeNull();
    expect(r.progress).toBe(100);
  });
});
