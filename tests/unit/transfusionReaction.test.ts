/**
 * 健澜科技 jlmedaios - 输血反应纯函数测试（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { blocksFutureTransfusion, isSevere, REACTION_LABEL } from '../../src/medical-tools/nursing/transfusionReaction.js';

describe('isSevere', () => {
  it('溶血 -> severe', () => {
    expect(isSevere('hemolysis', 'mild')).toBe(true);
  });
  it('severe 任意类型 -> severe', () => {
    expect(isSevere('fever', 'severe')).toBe(true);
  });
  it('mild fever -> not severe', () => {
    expect(isSevere('fever', 'mild')).toBe(false);
  });
});

describe('blocksFutureTransfusion', () => {
  it('hemolysis -> 阻断', () => {
    expect(blocksFutureTransfusion('hemolysis', 'mild')).toBe(true);
  });
  it('mild allergy -> 不阻断', () => {
    expect(blocksFutureTransfusion('allergy', 'mild')).toBe(false);
  });
});

describe('REACTION_LABEL', () => {
  it('hemolysis label', () => {
    expect(REACTION_LABEL.hemolysis).toBe('溶血反应');
  });
});
