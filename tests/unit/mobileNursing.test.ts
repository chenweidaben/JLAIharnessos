/**
 * 健澜科技 jlmedaios - 移动护理 PDA 纯函数单测（M16-A）
 *
 * 标签 M16A_TEST。覆盖：条码解析 / 五重核对（全匹配与各类错配）/
 * Braden/Morse/Barthel/疼痛/营养评分边界与层级 / SBAR 组织 / 离线冲突检测。
 * 纯函数、不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
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
} from '../../src/medical-tools/nursing/mobileNursing.js';

describe('M16A_TEST 条码解析 parseBarcode', () => {
  it('IP 前缀 → 患者腕带', () => {
    expect(parseBarcode('IP001')).toMatchObject({ kind: 'wristband', value: 'IP001' });
  });
  it('SM 前缀 → 标本', () => {
    expect(parseBarcode('SM000abc1234')).toMatchObject({ kind: 'specimen' });
  });
  it('D+三位数字 → 药品', () => {
    expect(parseBarcode('D001')).toMatchObject({ kind: 'drug', value: 'D001' });
    expect(parseBarcode('D999').kind).toBe('drug');
  });
  it('无法识别 → unknown（不猜）', () => {
    expect(parseBarcode('').kind).toBe('unknown');
    expect(parseBarcode('D12').kind).toBe('unknown');
    expect(parseBarcode('X001').kind).toBe('unknown');
    expect(parseBarcode('IPX').kind).toBe('wristband'); // IP 前缀即腕带
  });
});

describe('M16A_TEST 五重核对 verifyFiveRights', () => {
  const base = {
    visit: { bedNo: '12床', patientName: '张*三' },
    order: { content: '阿司匹林 100mg po', dose: '100mg', drugCode: 'D001' },
  };
  it('全匹配 → allOk', () => {
    const r = verifyFiveRights({
      ...base,
      scanned: { bedNo: '12床', patientName: '张*三', drugCode: 'D001', dose: '100mg' },
    });
    expect(r.allOk).toBe(true);
    expect(r.mismatches).toEqual([]);
    expect(r.time.ok).toBe(true);
  });
  it('床号不符 → 409 类 mismatches', () => {
    const r = verifyFiveRights({
      ...base, scanned: { bedNo: '15床', patientName: '张*三', drugCode: 'D001', dose: '100mg' },
    });
    expect(r.allOk).toBe(false);
    expect(r.bedNo.ok).toBe(false);
    expect(r.mismatches.join('')).toContain('床号');
  });
  it('姓名不符', () => {
    const r = verifyFiveRights({
      ...base, scanned: { bedNo: '12床', patientName: '李*四', drugCode: 'D001', dose: '100mg' },
    });
    expect(r.patientName.ok).toBe(false);
    expect(r.allOk).toBe(false);
  });
  it('药品不符', () => {
    const r = verifyFiveRights({
      ...base, scanned: { bedNo: '12床', patientName: '张*三', drugCode: 'D002', dose: '100mg' },
    });
    expect(r.drug.ok).toBe(false);
  });
  it('剂量不符', () => {
    const r = verifyFiveRights({
      ...base, scanned: { bedNo: '12床', patientName: '张*三', drugCode: 'D001', dose: '200mg' },
    });
    expect(r.dose.ok).toBe(false);
  });
  it('就诊未分配床位 → 床号放行', () => {
    const r = verifyFiveRights({
      visit: { bedNo: null, patientName: '张*三' },
      order: { content: 'x', drugCode: 'D001' },
      scanned: { patientName: '张*三', drugCode: 'D001' },
    });
    expect(r.bedNo.ok).toBe(true);
    expect(r.allOk).toBe(true);
  });
  it('医嘱无剂量/药品编码 → 放行', () => {
    const r = verifyFiveRights({
      visit: { bedNo: '1床', patientName: '王*五' },
      order: { content: '护理措施' },
      scanned: { bedNo: '1床', patientName: '王*五' },
    });
    expect(r.allOk).toBe(true);
  });
});

describe('M16A_TEST Braden 压疮评分', () => {
  it('最小 6 分 → 高风险', () => {
    expect(scoreBraden({ sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, frictionShear: 1 }))
      .toMatchObject({ score: 6, band: 'high' });
  });
  it('边界：9 高 / 10 中 / 13 低 / 15 较低 / 19 无', () => {
    const mk = (sensory: number, moisture: number, activity: number, mobility: number, nutrition: number, frictionShear: number) =>
      scoreBraden({ sensory, moisture, activity, mobility, nutrition, frictionShear });
    expect(mk(2, 2, 2, 1, 1, 1).score).toBe(9);
    expect(mk(2, 2, 2, 1, 2, 1).band).toBe('medium'); // 10
    expect(mk(3, 3, 3, 2, 1, 1).band).toBe('low'); // 13
    expect(mk(3, 3, 3, 3, 3, 2).band).toBe('low'); // 17
    expect(mk(4, 4, 4, 4, 4, 3).score).toBe(23);
    expect(mk(4, 4, 4, 4, 4, 3).band).toBe('none');
  });
});

describe('M16A_TEST Morse 跌倒评分', () => {
  it('0 → 低；25 → 中；45 → 高', () => {
    expect(scoreMorse({ fallHistory: 0, multipleDiagnoses: 0, ambulationAid: 0, ivTherapy: 0, gait: 0, mentalStatus: 0 }).band).toBe('low');
    expect(scoreMorse({ fallHistory: 25, multipleDiagnoses: 0, ambulationAid: 0, ivTherapy: 0, gait: 0, mentalStatus: 0 }).band).toBe('medium');
    expect(scoreMorse({ fallHistory: 25, multipleDiagnoses: 15, ambulationAid: 0, ivTherapy: 20, gait: 0, mentalStatus: 0 }).band).toBe('high');
  });
});

describe('M16A_TEST Barthel ADL 评分', () => {
  it('0 重度 / 41 中度 / 61 轻度 / 100 自理', () => {
    expect(scoreBarthel({ feeding: 0, bathing: 0, grooming: 0, dressing: 0, toileting: 0, bowel: 0, bladder: 0, transfers: 0, walking: 0, stairs: 0 }).band).toBe('high');
    expect(scoreBarthel({ feeding: 5, bathing: 0, grooming: 5, dressing: 5, toileting: 5, bowel: 10, bladder: 10, transfers: 0, walking: 0, stairs: 0 }).score).toBe(40);
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfers: 5, walking: 0, stairs: 0 }).score).toBe(65);
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfers: 5, walking: 0, stairs: 0 }).level).toBe('轻度依赖');
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfers: 15, walking: 15, stairs: 10 }).score).toBe(100);
    expect(scoreBarthel({ feeding: 10, bathing: 5, grooming: 5, dressing: 10, toileting: 10, bowel: 10, bladder: 10, transfers: 15, walking: 15, stairs: 10 }).level).toBe('完全自理');
  });
});

describe('M16A_TEST 疼痛 NRS', () => {
  it('0 无 / 1-3 轻 / 4-6 中 / 7-10 重', () => {
    expect(painLevel(0).level).toBe('无');
    expect(painLevel(2).level).toBe('轻度');
    expect(painLevel(5).level).toBe('中度');
    expect(painLevel(8).level).toBe('重度');
  });
});

describe('M16A_TEST NRS2002 营养风险', () => {
  it('<3 低风险 / ≥3 高风险', () => {
    expect(nutritionRisk({ bmi: 22 }).highRisk).toBe(false);
    expect(nutritionRisk({ bmi: 17, weightLossPct: 3, age: 72 }).score).toBeGreaterThanOrEqual(3);
    expect(nutritionRisk({ bmi: 17, weightLossPct: 3, age: 72 }).highRisk).toBe(true);
    expect(nutritionRisk({ bmi: 20, diseaseStress: true, age: 71 }).highRisk).toBe(true);
  });
});

describe('M16A_TEST SBAR 组织', () => {
  it('四段结构化并 trim', () => {
    const s = buildSbarSections({ situation: ' 现状 ', recommendation: '建议' });
    expect(s).toMatchObject({ S: '现状', B: '', A: '', R: '建议' });
  });
});

describe('M16A_TEST 离线同步冲突', () => {
  it('给药类远端已有同槽 → 冲突需人工确认', () => {
    const c = detectSyncConflict({ type: 'administer', orderId: 'o1', slot: '2026-01-01T08:00' }, { hasAdministeredSlot: true });
    expect(c.conflict).toBe(true);
    expect(c.requiresManualConfirm).toBe(true);
  });
  it('非给药类或远端无记录 → 无冲突', () => {
    expect(detectSyncConflict({ type: 'vitals' }, { hasAdministeredSlot: true }).conflict).toBe(false);
    expect(detectSyncConflict({ type: 'administer' }, {}).conflict).toBe(false);
  });
});
