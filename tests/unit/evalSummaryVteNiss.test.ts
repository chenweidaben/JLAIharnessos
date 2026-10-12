/**
 * 健澜科技 jlmedaios - M46-C 护士屏 VTE/院感块纯函数测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary vte/infection', () => {
  it('高出血标红', () => {
    const s = buildEvalSummary({
      vte: { drug: 'warfarin', active: true, bleedingScore: 50 },
    });
    expect(s.vte.highBleeding).toBe(true);
    expect(s.flags).toContain('vte_high_bleeding');
  });
  it('active 院感标红', () => {
    const s = buildEvalSummary({
      infection: { activeCount: 1, latestType: 'SSI', latestStatus: 'reported' },
    });
    expect(s.infection.activeCount).toBe(1);
    expect(s.flags).toContain('active_niss');
  });
  it('正常不标红', () => {
    const s = buildEvalSummary({
      vte: { drug: 'enoxaparin', active: true, bleedingScore: 10 },
      infection: { activeCount: 0 },
    });
    expect(s.vte.highBleeding).toBe(false);
    expect(s.flags).not.toContain('vte_high_bleeding');
    expect(s.flags).not.toContain('active_niss');
  });
});
