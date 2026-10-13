/**
 * 健澜科技 jlmedaios - 护士屏 PICC 块纯函数测试（M69-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { buildEvalSummary } from '../../src/medical-tools/nursing/evalSummary.js';

describe('evalSummary picc block', () => {
  it('无记录 -> due false, complicationAlert false', () => {
    const s = buildEvalSummary({ picc: null });
    expect(s.picc.due).toBe(false);
    expect(s.picc.complicationAlert).toBe(false);
  });

  it('超过 7 天未维护 -> due true', () => {
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const s = buildEvalSummary({ picc: { deviceType: 'picc', lastMaintainedAt: old, complication: 'none' } });
    expect(s.picc.due).toBe(true);
    expect(s.flags).toContain('picc_maintenance_due');
  });

  it('并发症非 none -> complicationAlert true', () => {
    const s = buildEvalSummary({ picc: { deviceType: 'port', lastMaintainedAt: new Date().toISOString().slice(0, 10), complication: 'thrombosis' } });
    expect(s.picc.complicationAlert).toBe(true);
    expect(s.flags).toContain('picc_complication');
  });
});
