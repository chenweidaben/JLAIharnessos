/**
 * S-10 voice_to_vitals 语音体征解析单测（4.3.2 / 4.3.5）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { parseVitalsText } from '@/bff/agents/inpatient/vitalsParser.js';

describe('语音体征解析 - 正常体征', () => {
  it('多体征并列解析为结构化项，默认单位与正常范围标注正确', () => {
    const result = parseVitalsText('血压 138/86、心率 82、体温 36.8℃、呼吸 18、血氧 96%、血糖 5.2 mmol/L');
    expect(result.vitals.length).toBe(6);
    expect(result.unrecognized).toEqual([]);
    expect(result.missingInfo).toEqual([]);

    const blood = result.vitals.find((vital) => vital.item === 'blood-pressure');
    expect(blood?.values).toEqual([138, 86]);
    expect(blood?.normalizedUnit).toBe('mmHg');
    expect(blood?.flag).toBe('normal');

    const heart = result.vitals.find((vital) => vital.item === 'heart-rate');
    expect(heart?.values).toEqual([82]);
    expect(heart?.normalizedUnit).toBe('/min');
    expect(heart?.needsManualReview).toBe(false);

    const temp = result.vitals.find((vital) => vital.item === 'temperature');
    expect(temp?.values).toEqual([36.8]);
    expect(temp?.normalizedUnit).toBe('℃');
  });
});

describe('语音体征解析 - 异常与危急值', () => {
  it('超参考范围项标记 abnormal 并要求人工复核', () => {
    const result = parseVitalsText('心率 110、体温 37.8℃、呼吸 24、血氧 93%、血糖 8.2 mmol/L');
    expect(result.vitals.every((vital) => vital.needsManualReview)).toBe(true);
    expect(result.vitals.every((vital) => vital.flag === 'abnormal')).toBe(true);
  });

  it('危急值项标记 critical 并强制转人工核对', () => {
    const result = parseVitalsText('血压 190/115、心率 35、体温 39.8℃、呼吸 35、血氧 88%、血糖 22 mmol/L');
    expect(result.vitals.length).toBe(6);
    expect(result.vitals.every((vital) => vital.critical)).toBe(true);
    expect(result.vitals.every((vital) => vital.flag === 'critical')).toBe(true);
    expect(result.vitals.every((vital) => vital.needsManualReview)).toBe(true);
  });
});

describe('语音体征解析 - 单位换算', () => {
  it('华氏度换算为摄氏度并保留换算留痕', () => {
    const result = parseVitalsText('体温 100℉');
    const temp = result.vitals.find((vital) => vital.item === 'temperature');
    expect(temp?.normalizedUnit).toBe('℃');
    expect(temp?.values[0]).toBe(37.8);
    expect(temp?.conversionNote).toContain('℉ 100');
    expect(temp?.flag).toBe('abnormal');
  });

  it('mg/dL 血糖换算为 mmol/L 并保留换算留痕', () => {
    const result = parseVitalsText('血糖 180 mg/dL');
    const glucose = result.vitals.find((vital) => vital.item === 'blood-glucose');
    expect(glucose?.normalizedUnit).toBe('mmol/L');
    expect(glucose?.values[0]).toBeCloseTo(10.0, 1);
    expect(glucose?.conversionNote).toContain('mg/dL 180');
  });

  it('摄氏度与 mmol/L 输入保持原口径不变', () => {
    const result = parseVitalsText('体温 36.8℃、血糖 5.2 mmol/L');
    const temp = result.vitals.find((vital) => vital.item === 'temperature');
    const glucose = result.vitals.find((vital) => vital.item === 'blood-glucose');
    expect(temp?.normalizedUnit).toBe('℃');
    expect(glucose?.normalizedUnit).toBe('mmol/L');
    expect(temp?.conversionNote).toBeUndefined();
    expect(glucose?.conversionNote).toBeUndefined();
  });
});

describe('语音体征解析 - 兜底与未识别片段', () => {
  it('无法识别片段保留原文并进入 missingInfo，不臆造体征项', () => {
    const result = parseVitalsText('血压 128/80、患者感觉有点喘，说不清具体哪里不舒服');
    expect(result.vitals.length).toBe(1);
    expect(result.unrecognized).toContain('患者感觉有点喘');
    expect(result.unrecognized).toContain('说不清具体哪里不舒服');
    expect(result.missingInfo.join('；')).toContain('患者感觉有点喘');
  });

  it('已知体征词缺失数值时进入缺项清单，不生成残缺体征项', () => {
    const result = parseVitalsText('血压');
    expect(result.vitals).toEqual([]);
    expect(result.missingInfo.some((item) => item.includes('血压'))).toBe(true);
  });

  it('血压双值结构可识别，舒张压独立参与范围判断', () => {
    const result = parseVitalsText('血压 102/54');
    const blood = result.vitals.find((vital) => vital.item === 'blood-pressure');
    expect(blood?.values).toEqual([102, 54]);
    expect(blood?.flag).toBe('abnormal');
    expect(blood?.needsManualReview).toBe(true);
  });
});
