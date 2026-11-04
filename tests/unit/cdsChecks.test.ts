/**
 * 健澜AI原生医院操作系统OS - P2-2 CDS 规则引擎 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  evaluateMedication,
  checkLabCritical,
  acknowledge,
} from '../../src/bff/aggregators/cdsChecksAggregator';

beforeEach(() => { __resetStore(); });

const BASE = { dose: 500, route: 'po', durationDays: 3, patientAge: 50 };

describe('P2-2 剂量超量', () => {
  test('paracetamol 5g/24h → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'paracetamol', dose: 5000 });
    expect(r.level).toBe('hard-stop');
    expect(r.findings.some((f) => f.ruleId === 'dose-paracetamol')).toBe(true);
  });
  test('warfarin 15mg → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'warfarin', dose: 15 });
    expect(r.level).toBe('hard-stop');
  });
  test('metformin 500mg → clear', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'metformin', dose: 500 });
    expect(r.level).not.toBe('hard-stop');
  });
});

describe('P2-2 给药途径禁忌', () => {
  test('metoprolol iv-push → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'metoprolol', route: 'iv-push' });
    expect(r.level).toBe('hard-stop');
  });
  test('amoxicillin intrathecal → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'amoxicillin', route: 'intrathecal' });
    expect(r.level).toBe('hard-stop');
  });
});

describe('P2-2 疗程超限', () => {
  test('ibuprofen 20 天 → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'ibuprofen', durationDays: 20 });
    expect(r.level).toBe('warning');
  });
  test('amoxicillin 20 天 → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'amoxicillin', durationDays: 20 });
    expect(r.level).toBe('warning');
  });
});

describe('P2-2 特殊人群', () => {
  test('孕妇 warfarin → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'warfarin', isPregnant: true });
    expect(r.level).toBe('hard-stop');
  });
  test('孕妇 atorvastatin → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'atorvastatin', isPregnant: true });
    expect(r.level).toBe('hard-stop');
  });
  test('肾功能不全 metformin → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'metformin', hasRenalDysfunction: true });
    expect(r.level).toBe('warning');
  });
  test('肝功能不全 paracetamol → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'paracetamol', hasHepaticDysfunction: true });
    expect(r.level).toBe('warning');
  });
});

describe('P2-2 药物相互作用', () => {
  test('warfarin + ibuprofen 同开 → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'warfarin', dose: 5, concurrentDrugs: ['ibuprofen'] });
    expect(r.level).toBe('warning');
  });
  test('warfarin + amiodarone → warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'warfarin', dose: 5, concurrentDrugs: ['amiodarone'] });
    expect(r.findings.some((f) => f.message.includes('胺碘酮'))).toBe(true);
  });
  test('lisinopril + spironolactone → warning（高钾）', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'lisinopril', concurrentDrugs: ['spironolactone'] });
    expect(r.level).toBe('warning');
  });
});

describe('P2-2 静脉配伍禁忌', () => {
  test('IV cefepime + acyclovir → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'cefepime', route: 'iv', concurrentDrugs: ['acyclovir'] });
    expect(r.level).toBe('hard-stop');
  });
  test('IV phenytoin + furosemide → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'phenytoin', route: 'iv', concurrentDrugs: ['furosemide'] });
    expect(r.level).toBe('hard-stop');
  });
});

describe('P2-2 重复用药', () => {
  test('ibuprofen + aspirin（同 NSAID）→ warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'ibuprofen', concurrentDrugs: ['aspirin'] });
    expect(r.findings.some((f) => f.category === 'duplicate-therapy')).toBe(true);
  });
  test('lisinopril + enalapril（同 ACEI）→ warning', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'lisinopril', concurrentDrugs: ['enalapril'] });
    expect(r.findings.some((f) => f.ruleId === 'dup-acei')).toBe(true);
  });
});

describe('P2-2 诊断-用药禁忌', () => {
  test('哮喘患者 metoprolol → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'metoprolol', currentDiagnoses: ['asthma'] });
    expect(r.level).toBe('hard-stop');
  });
  test('G6PD 患者 primaquine → hard-stop', () => {
    const r = evaluateMedication({ ...BASE, drugCode: 'primaquine', currentDiagnoses: ['g6pd-deficiency'] });
    expect(r.level).toBe('hard-stop');
  });
});

describe('P2-2 危急值', () => {
  test('血钾 2.5 → 触发 alert；血钾 4.0 → null', () => {
    const a = checkLabCritical({ visitId: 'V', patientId: 'P', labCode: 'K', value: 2.5, unit: 'mmol/L' });
    expect(a?.status).toBe('open');
    expect(checkLabCritical({ visitId: 'V', patientId: 'P', labCode: 'K', value: 4.0, unit: 'mmol/L' })).toBeNull();
  });
  test('血糖 25 → 触发；INR 5.0 → 触发', () => {
    expect(checkLabCritical({ visitId: 'V', patientId: 'P', labCode: 'glucose', value: 25, unit: 'mmol/L' })?.alertId).toBeTruthy();
    expect(checkLabCritical({ visitId: 'V', patientId: 'P', labCode: 'inr', value: 5.0, unit: '' })?.alertId).toBeTruthy();
  });
  test('acknowledge → acknowledged 留痕', () => {
    const a = checkLabCritical({ visitId: 'V', patientId: 'P', labCode: 'platelet', value: 30, unit: 'x10^9/L' });
    const ack = acknowledge(a!.alertId, 'doc1', '已处理');
    expect(ack.status).toBe('acknowledged');
    expect(ack.acknowledgedBy).toBe('doc1');
  });
});
