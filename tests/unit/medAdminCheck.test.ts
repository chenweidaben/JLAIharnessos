/**
 * 健澜科技 jlmedaios - 给药三查七对纯函数单测（M17-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  runFiveChecks,
  allChecksPass,
  isHighRiskMed,
  requiresDoubleCheck,
  requiresOverrideReason,
  canOverride,
  computeMedErrorMetrics,
} from '@/medical-tools/nursing/medAdminCheck';

describe('medAdminCheck 五对核对', () => {
  it('全部一致 => 五项全 pass', () => {
    const items = runFiveChecks({
      wristbandPatientId: 'p1', visitPatientId: 'p1',
      orderMedName: '阿莫西林', actualMedName: '阿莫西林',
      orderDose: '0.5g', actualDose: '0.5g',
      withinTimeWindow: true, notExpired: true,
    });
    expect(allChecksPass(items)).toBe(true);
    expect(items.map((i) => i.key)).toEqual(['patient', 'med', 'dose', 'time', 'expire']);
  });

  it('患者不符 => patient fail', () => {
    const items = runFiveChecks({
      wristbandPatientId: 'pX', visitPatientId: 'p1',
      orderMedName: 'x', actualMedName: 'x', orderDose: '1', actualDose: '1',
      withinTimeWindow: true, notExpired: true,
    });
    expect(items[0].ok).toBe(false);
    expect(allChecksPass(items)).toBe(false);
  });

  it('药名/剂量大小写与空白差异仍 pass（归一化）', () => {
    const items = runFiveChecks({
      wristbandPatientId: 'p1', visitPatientId: 'p1',
      orderMedName: 'Morphine', actualMedName: ' morphine ',
      orderDose: '10mg', actualDose: '10MG',
      withinTimeWindow: true, notExpired: true,
    });
    expect(allChecksPass(items)).toBe(true);
  });
});

describe('高危药与双人核对', () => {
  it('吗啡/胰岛素/肾上腺素判为高危', () => {
    expect(isHighRiskMed('盐酸吗啡注射液')).toBe(true);
    expect(isHighRiskMed('普通维生素C片')).toBe(false);
    expect(requiresDoubleCheck(isHighRiskMed('胰岛素'))).toBe(true);
    expect(requiresDoubleCheck(false)).toBe(false);
  });
});

describe('CDS override', () => {
  it('未被拦不需要理由；被拦理由空 => 不放行', () => {
    expect(requiresOverrideReason(false)).toBe(false);
    expect(requiresOverrideReason(true)).toBe(true);
    expect(canOverride(false, null)).toBe(true);
    expect(canOverride(true, '')).toBe(false);
    expect(canOverride(true, '医师已确认')).toBe(true);
  });
});

describe('NQI_MED_ERROR 分子分母', () => {
  it('分母=given 数，分子=差错类 error_type 数', () => {
    const m = computeMedErrorMetrics([
      { status: 'given', errorType: 'none' },
      { status: 'given', errorType: 'wrong_patient' },
      { status: 'given', errorType: 'adr' },
      { status: 'held', errorType: null },
      { status: 'given', errorType: null },
    ]);
    expect(m.fractions.medErrorRate.numerator).toBe(2);
    expect(m.fractions.medErrorRate.denominator).toBe(4);
    expect(m.medErrorRate).toBe(50);
  });

  it('无 given => 0 不除零', () => {
    const m = computeMedErrorMetrics([{ status: 'held', errorType: null }]);
    expect(m.medErrorRate).toBe(0);
    expect(m.fractions.medErrorRate.denominator).toBe(0);
  });
});
