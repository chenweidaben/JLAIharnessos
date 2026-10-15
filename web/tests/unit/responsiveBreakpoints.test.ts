/**
 * 健澜科技 jlmedaios - 移动端响应式适配测试（M128-A）
 *
 * 覆盖：
 *   1. 响应式断点：mobile <768 / tablet 768~1023 / desktop >=1024 边界值；
 *   2. 布局切换：单列/双列/多列栅格、导航形态、表格卡片化；
 *   3. 文字大小：字号最小 14px 兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */
import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  MIN_FONT_SIZE,
  getDeviceType,
  getLayoutClass,
  getNavMode,
  getGridColumns,
  resolveFontSize,
  shouldUseCardTable,
} from '@/utils/responsive';

describe('响应式断点 getDeviceType', () => {
  it('手机端：宽度 <768px 判定为 mobile', () => {
    expect(getDeviceType(320)).toBe('mobile');
    expect(getDeviceType(375)).toBe('mobile');
    expect(getDeviceType(576)).toBe('mobile');
    expect(getDeviceType(767)).toBe('mobile');
  });

  it('平板端：768px <= 宽度 <1024px 判定为 tablet', () => {
    expect(getDeviceType(768)).toBe('tablet');
    expect(getDeviceType(900)).toBe('tablet');
    expect(getDeviceType(1023)).toBe('tablet');
  });

  it('桌面端：宽度 >=1024px 判定为 desktop', () => {
    expect(getDeviceType(1024)).toBe('desktop');
    expect(getDeviceType(1280)).toBe('desktop');
    expect(getDeviceType(1920)).toBe('desktop');
  });

  it('非法宽度（NaN / 负数 / Infinity）按手机端安全兜底', () => {
    expect(getDeviceType(NaN)).toBe('mobile');
    expect(getDeviceType(-100)).toBe('mobile');
    expect(getDeviceType(Infinity)).toBe('mobile');
  });

  it('断点常量与适配原则一致：md=768 / lg=1024', () => {
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
  });
});

describe('布局切换 getLayoutClass', () => {
  it('手机端单列布局 jl-layout-single', () => {
    expect(getLayoutClass(375)).toBe('jl-layout-single');
    expect(getLayoutClass(767)).toBe('jl-layout-single');
  });

  it('平板端双列布局 jl-layout-double', () => {
    expect(getLayoutClass(768)).toBe('jl-layout-double');
    expect(getLayoutClass(1023)).toBe('jl-layout-double');
  });

  it('桌面端多列布局 jl-layout-multi', () => {
    expect(getLayoutClass(1024)).toBe('jl-layout-multi');
    expect(getLayoutClass(1440)).toBe('jl-layout-multi');
  });
});

describe('栅格列数与导航形态', () => {
  it('栅格列数：手机1列 / 平板2列 / 桌面4列', () => {
    expect(getGridColumns(375)).toBe(1);
    expect(getGridColumns(800)).toBe(2);
    expect(getGridColumns(1280)).toBe(4);
  });

  it('导航切换：手机底部 Tab / 平板抽屉 / 桌面侧边栏', () => {
    expect(getNavMode(375)).toBe('bottom-tab');
    expect(getNavMode(800)).toBe('drawer');
    expect(getNavMode(1440)).toBe('sidebar');
  });

  it('手机端表格折叠为卡片形态，平板/桌面保持表格', () => {
    expect(shouldUseCardTable(375)).toBe(true);
    expect(shouldUseCardTable(767)).toBe(true);
    expect(shouldUseCardTable(768)).toBe(false);
    expect(shouldUseCardTable(1440)).toBe(false);
  });
});

describe('文字大小 resolveFontSize（最小 14px）', () => {
  it('低于 14px 的字号被兜底为 14px', () => {
    expect(resolveFontSize(12)).toBe(14);
    expect(resolveFontSize(11)).toBe(MIN_FONT_SIZE);
    expect(resolveFontSize(10)).toBe(14);
  });

  it('不低于 14px 的字号保持原值（四舍五入）', () => {
    expect(resolveFontSize(14)).toBe(14);
    expect(resolveFontSize(15)).toBe(15);
    expect(resolveFontSize(16.4)).toBe(16);
    expect(resolveFontSize(18.6)).toBe(19);
    expect(resolveFontSize(44)).toBe(44);
  });

  it('非法字号按 14px 兜底', () => {
    expect(resolveFontSize(NaN)).toBe(14);
    expect(resolveFontSize(-5)).toBe(14);
  });

  it('最小字号常量为 14', () => {
    expect(MIN_FONT_SIZE).toBe(14);
  });
});
