/**
 * 健澜科技 jlmedaios - 移动护理纯函数单测（M16-A / M16A_TEST）
 * 覆盖：parseBarcode、verifyFiveRights（全匹配/床号错/姓名错/药名错）、5 量表边界与层级、
 * painLevel、nutritionRisk、buildSbarSections、detectSyncConflict。
 * 纯函数、确定性、无 I/O，与后端同口径。
 */
import { describe, it, expect } from 'vitest';
import {
  buildSbarSections,
  detectSyncConflict,
  nutritionRisk,
  painLevel,
  parseBarcode,
  scoreBarthel,
  scoreBraden,
  scoreMorse,
  verifyFiveRights,
} from '@/utils/mobileNursing';

describe('M16A_TEST parseBarcode', () => {
  it('腕带：IP+数字', () => {
    expect(parseBarcode('IP001')).toEqual({ kind: 'wristband', value: 'IP001' });
    expect(parseBarcode(' IP123 ')).toEqual({ kind: 'wristband', value: 'IP123' });
  });
  it('标本：SM 开头', () => {
    expect(parseBarcode('SMABC123')).toEqual({ kind: 'specimen', value: 'SMABC123' });
  });
  it('药品：D+3位数字', () => {
    expect(parseBarcode('D001')).toEqual({ kind: 'drug', value: 'D001' });
    expect(parseBarcode('D12')).toEqual({ kind: 'unknown', value: 'D12' });
    expect(parseBarcode('D1234')).toEqual({ kind: 'unknown', value: 'D1234' });
  });
  it('其余 unknown', () => {
    expect(parseBarcode('XYZ')).toEqual({ kind: 'unknown', value: 'XYZ' });
    expect(parseBarcode('')).toEqual({ kind: 'unknown', value: '' });
  });
});

describe('M16A_TEST verifyFiveRights', () => {
  const base = {
    visit: { bedNo: '12床', patientName: '张三' },
    order: { content: '生理盐水', dose: '250ml', drugCode: 'D001' },
    scanned: { bedNo: '12床', patientName: '张三', drugCode: 'D001' },
    now: '2026-10-08T08:00:00.000Z',
  };
  it('全匹配 allOk', () => {
    const r = verifyFiveRights(base);
    expect(r.allOk).toBe(true);
    expect(r.mismatches).toHaveLength(0);
    expect(r.dose.ok).toBe(true);
    expect(r.time.ok).toBe(true);
  });
  it('床号错', () => {
    const r = verifyFiveRights({ ...base, scanned: { ...base.scanned, bedNo: '13床' } });
    expect(r.allOk).toBe(false);
    expect(r.bed.ok).toBe(false);
    expect(r.mismatches.join()).toContain('床号');
  });
  it('姓名错', () => {
    const r = verifyFiveRights({ ...base, scanned: { ...base.scanned, patientName: '李四' } });
    expect(r.allOk).toBe(false);
    expect(r.patient.ok).toBe(false);
    expect(r.mismatches.join()).toContain('姓名');
  });
  it('药名/药码错', () => {
    const r = verifyFiveRights({ ...base, scanned: { ...base.scanned, drugCode: 'D999' } });
    expect(r.allOk).toBe(false);
    expect(r.drug.ok).toBe(false);
    expect(r.mismatches.join()).toContain('药品');
  });
  it('无 lastGiven 时时间默认放行', () => {
    const r = verifyFiveRights(base);
    expect(r.time.ok).toBe(true);
  });
});

describe('M16A_TEST Braden', () => {
  it('全部最低分=6 → high', () => {
    const r = scoreBraden({ sensation: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, friction: 1 });
    expect(r.score).toBe(6);
    expect(r.level).toBe('high');
  });
  it('9 分 high，12 分 medium，14 分 low，18 分 none_low，19 分 none', () => {
    expect(scoreBraden({ sensation: 1, moisture: 1, activity: 2, mobility: 2, nutrition: 2, friction: 1 }).score).toBe(9);
    expect(scoreBraden({ sensation: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction: 2 }).level).toBe('medium');
    expect(scoreBraden({ sensation: 3, moisture: 2, activity: 2, mobility: 2, nutrition: 3, friction: 2 }).level).toBe('low');
    expect(scoreBraden({ sensation: 3, moisture: 3, activity: 3, mobility: 3, nutrition: 3, friction: 3 }).level).toBe('none_low');
    expect(scoreBraden({ sensation: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3 }).level).toBe('none');
  });
});

describe('M16A_TEST Morse', () => {
  it('0 分 low', () => {
    expect(scoreMorse({ fallHistory: 0, multipleDiagnosis: 0, ambulationAid: 0, ivTherapy: 0, gait: 0, cognition: 0 }).level).toBe('low');
  });
  it('45 分 high，25 分 medium 边界', () => {
    expect(scoreMorse({ fallHistory: 25, multipleDiagnosis: 15, ambulationAid: 0, ivTherapy: 0, gait: 0, cognition: 0 }).level).toBe('medium');
    expect(scoreMorse({ fallHistory: 25, multipleDiagnosis: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, cognition: 0 }).level).toBe('high');
  });
});

describe('M16A_TEST Barthel', () => {
  it('0 分 重度，100 分 自理', () => {
    expect(scoreBarthel({ feeding: 0, bathing: 0, grooming: 0, dressing: 0, toileting: 0, bowel: 0, bladder: 0, transfer: 0, walking: 0, stairs: 0 }).level).toBe('severe');
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfer: 15, walking: 15, stairs: 10 }).level).toBe('independent');
  });
  it('60 分中度，61 分轻度 边界', () => {
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfer: 0, walking: 0, stairs: 0 }).score).toBe(60);
  });
});

describe('M16A_TEST painLevel', () => {
  it('0 无 / 1-3 轻 / 4-6 中 / 7-10 重', () => {
    expect(painLevel(0).level).toBe('none');
    expect(painLevel(3).level).toBe('mild');
    expect(painLevel(6).level).toBe('moderate');
    expect(painLevel(10).level).toBe('severe');
  });
});

describe('M16A_TEST nutritionRisk', () => {
  it('≥3 高风险，<3 低风险', () => {
    expect(nutritionRisk({ bmiLow: 3, weightLoss: 0, reducedIntake: 0, severeStress: 0, ageGe70: 0 }).level).toBe('high');
    expect(nutritionRisk({ bmiLow: 0, weightLoss: 0, reducedIntake: 2, severeStress: 0, ageGe70: 0 }).level).toBe('low');
  });
});

describe('M16A_TEST buildSbarSections', () => {
  it('有值用值，缺项标注本班无记录', () => {
    const s = buildSbarSections({ situation: '术后观察', background: '', assessment: null });
    expect(s.situation).toBe('术后观察');
    expect(s.background).toBe('（本班无记录）');
    expect(s.assessment).toBe('（本班无记录）');
  });
});

describe('M16A_TEST detectSyncConflict', () => {
  it('给药类远端已有记录 → 冲突需人工确认', () => {
    const r = detectSyncConflict({ kind: 'administer', remoteHasRecord: true });
    expect(r.conflict).toBe(true);
    expect(r.reason).toBeTruthy();
  });
  it('普通写 / 远端无记录 → 不冲突', () => {
    expect(detectSyncConflict({ kind: 'write', remoteHasRecord: true }).conflict).toBe(false);
    expect(detectSyncConflict({ kind: 'administer', remoteHasRecord: false }).conflict).toBe(false);
  });
});
