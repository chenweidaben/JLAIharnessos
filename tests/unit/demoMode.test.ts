/**
 * 健澜科技 jlmedaios - M125-C 演示模式单测
 *
 * 覆盖：
 *  - isDemoMode：模式判断（布尔 / EnvConfig 对象 / 空值 fail-safe）；
 *  - maskForDemo：患者姓名轮换、医生-科室命名、IP/配置隐藏、嵌套与数组、入参不被修改；
 *  - getDemoViewConfig：水印显示开关与文案（前端提示条 / 全屏水印）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  getDemoViewConfig,
  isDemoMode,
  maskForDemo,
} from '../../src/bff/aggregators/demoModeAggregator';

/* ------------------------------------------------------------------ */
/* isDemoMode：模式判断                                                  */
/* ------------------------------------------------------------------ */

describe('isDemoMode', () => {
  it('EnvConfig.demoMode = true → 演示模式', () => {
    expect(isDemoMode({ demoMode: true })).toBe(true);
  });
  it('EnvConfig.demoMode = false → 非演示模式', () => {
    expect(isDemoMode({ demoMode: false })).toBe(false);
  });
  it('兼容裸布尔入参', () => {
    expect(isDemoMode(true)).toBe(true);
    expect(isDemoMode(false)).toBe(false);
  });
  it('null / undefined / 无 demoMode 字段 → fail-safe 返回 false', () => {
    expect(isDemoMode(null)).toBe(false);
    expect(isDemoMode(undefined)).toBe(false);
    expect(isDemoMode({})).toBe(false);
    expect(isDemoMode({ nodeEnv: 'production' })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* maskForDemo：数据脱敏                                                 */
/* ------------------------------------------------------------------ */

describe('maskForDemo', () => {
  it('患者姓名按出现顺序轮换为 演示患者A/B/C', () => {
    const out = maskForDemo({
      list: [
        { patientName: '张三' },
        { patientName: '李四' },
        { patientName: '王五' },
      ],
    }) as { list: Array<{ patientName: string }> };
    expect(out.list[0].patientName).toBe('演示患者A');
    expect(out.list[1].patientName).toBe('演示患者B');
    expect(out.list[2].patientName).toBe('演示患者C');
  });

  it('医生姓名替换为 演示医生-科室名，科室取自同层 dept', () => {
    const out = maskForDemo({
      dept: '心内科',
      doctorName: '李明',
    }) as { dept: string; doctorName: string };
    expect(out.doctorName).toBe('演示医生-心内科');
    // 非敏感字段保留
    expect(out.dept).toBe('心内科');
  });

  it('医生科室缺失时回退「内科」', () => {
    const out = maskForDemo({ doctorName: '王医生' }) as { doctorName: string };
    expect(out.doctorName).toBe('演示医生-内科');
  });

  it('真实 IP / Host / 密钥 / 数据库连接串被统一隐藏', () => {
    const out = maskForDemo({
      clientIp: '10.20.30.40',
      host: 'internal.jlan.local',
      apiKey: 'sk-real-secret',
      databaseUrl: 'postgres://user:pass@db:5432/his',
    }) as Record<string, string>;
    expect(out.clientIp).toBe('***（演示模式已隐藏）');
    expect(out.host).toBe('***（演示模式已隐藏）');
    expect(out.apiKey).toBe('***（演示模式已隐藏）');
    expect(out.databaseUrl).toBe('***（演示模式已隐藏）');
  });

  it('递归处理嵌套对象与数组，非敏感标量原样保留', () => {
    const input = {
      ward: '3床',
      vitals: { heartRate: 72, temperature: 36.5 },
      notes: [{ patientName: '赵六', doctorName: '孙医生' }],
    };
    const out = maskForDemo(input) as {
      ward: string;
      vitals: { heartRate: number; temperature: number };
      notes: Array<{ patientName: string; doctorName: string }>;
    };
    expect(out.ward).toBe('3床');
    expect(out.vitals.heartRate).toBe(72);
    expect(out.vitals.temperature).toBe(36.5);
    expect(out.notes[0].patientName).toBe('演示患者A');
  });

  it('不修改入参（深拷贝副本）', () => {
    const input = { patientName: '张三', ip: '10.0.0.1' };
    maskForDemo(input);
    expect(input.patientName).toBe('张三');
    expect(input.ip).toBe('10.0.0.1');
  });
});

/* ------------------------------------------------------------------ */
/* getDemoViewConfig：水印显示                                           */
/* ------------------------------------------------------------------ */

describe('getDemoViewConfig', () => {
  it('演示模式：提示条与水印可见且文案非空', () => {
    const view = getDemoViewConfig(true);
    expect(view.visible).toBe(true);
    expect(view.bannerText).toContain('演示模式');
    expect(view.watermarkText).toContain('杭州健澜科技有限公司');
  });
  it('生产模式：整体隐藏、文案置空', () => {
    const view = getDemoViewConfig(false);
    expect(view.visible).toBe(false);
    expect(view.bannerText).toBe('');
    expect(view.watermarkText).toBe('');
  });
});
