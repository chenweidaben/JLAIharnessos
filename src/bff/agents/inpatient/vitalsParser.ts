/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/vitalsParser.ts
 *
 * voice_to_vitals 语音体征解析（4.3.2）：自由文本 → 结构化体征项；内置合成参考范围
 * 与危急值字典，真实药典、参考范围库与危急值字典接线列入未闭环项。
 *
 * 纯函数离线实现；无法识别的片段保留原文并入 missingInfo，不臆造体征项。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ParsedVital, VitalFlag, VitalsParseResult } from './types.js';

interface RangeResult {
  flag: Exclude<VitalFlag, 'unknown'>;
  critical: boolean;
}

function classifyRange(
  value: number,
  min: number,
  max: number,
  criticalLow: number,
  criticalHigh: number,
): RangeResult {
  if (value <= criticalLow || value >= criticalHigh) return { flag: 'critical', critical: true };
  if (value < min || value > max) return { flag: 'abnormal', critical: false };
  return { flag: 'normal', critical: false };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function splitSegments(text: string): string[] {
  return text
    .split(/[，,；;、\n\r\t]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function makeVital(partial: Omit<ParsedVital, 'flag' | 'critical' | 'needsManualReview'>, range: RangeResult): ParsedVital {
  return {
    ...partial,
    flag: range.flag,
    critical: range.critical,
    needsManualReview: range.flag !== 'normal',
  };
}

function parseBloodPressure(segment: string): ParsedVital | null {
  const match = segment.match(/血压\s*([0-9]{2,3})\s*[/／]\s*([0-9]{2,3})\s*(mmHg|毫米汞柱)?/);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  const sysRange = classifyRange(systolic, 90, 139, 90, 180);
  const diaRange = classifyRange(diastolic, 60, 89, 50, 110);
  const critical = sysRange.critical || diaRange.critical;
  const flag: VitalFlag = critical ? 'critical' : sysRange.flag === 'abnormal' || diaRange.flag === 'abnormal' ? 'abnormal' : 'normal';
  return {
    item: 'blood-pressure',
    values: [systolic, diastolic],
    rawUnit: match[3] ?? '',
    normalizedUnit: 'mmHg',
    flag,
    critical,
    needsManualReview: flag !== 'normal',
    sourceText: segment,
  };
}

function parseHeartRate(segment: string): ParsedVital | null {
  const match = segment.match(/(?:心率|脉搏)\s*([0-9]{2,3})\s*(次\/分|\/min|\/分)?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const range = classifyRange(value, 60, 100, 40, 130);
  return makeVital(
    { item: 'heart-rate', values: [value], rawUnit: match[2] ?? '', normalizedUnit: '/min', sourceText: segment },
    range,
  );
}

function parseTemperature(segment: string): ParsedVital | null {
  const match = segment.match(/体温\s*([0-9]+(?:\.[0-9]+)?)\s*(℃|°C|℉|度)?/);
  if (!match) return null;
  const rawValue = Number(match[1]);
  if (!Number.isFinite(rawValue)) return null;
  const rawUnit = match[2] ?? '';
  let normalized = rawValue;
  let conversionNote: string | undefined;
  let normalizedUnit = '℃';
  if (rawUnit === '℉') {
    normalized = round1(((rawValue - 32) * 5) / 9);
    conversionNote = `℉ ${rawValue} → ℃ ${normalized}`;
  } else if (rawUnit === '度') {
    normalizedUnit = '℃';
  }
  const range = classifyRange(normalized, 36.0, 37.2, 35.0, 39.5);
  return makeVital(
    {
      item: 'temperature',
      values: [normalized],
      rawUnit,
      normalizedUnit,
      sourceText: segment,
      conversionNote,
    },
    range,
  );
}

function parseRespiration(segment: string): ParsedVital | null {
  const match = segment.match(/呼吸\s*([0-9]{1,3})\s*(次\/分|\/min|\/分)?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const range = classifyRange(value, 12, 20, 8, 30);
  return makeVital(
    { item: 'respiration', values: [value], rawUnit: match[2] ?? '', normalizedUnit: '/min', sourceText: segment },
    range,
  );
}

function parseOxygenSaturation(segment: string): ParsedVital | null {
  const match = segment.match(/血氧\s*([0-9]{2,3})\s*%?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const critical = value <= 90;
  const flag: VitalFlag = critical ? 'critical' : value < 95 ? 'abnormal' : 'normal';
  return {
    item: 'oxygen-saturation',
    values: [value],
    rawUnit: '%',
    normalizedUnit: '%',
    flag,
    critical,
    needsManualReview: flag !== 'normal',
    sourceText: segment,
  };
}

function parseGlucose(segment: string): ParsedVital | null {
  const match = segment.match(/血糖\s*([0-9]+(?:\.[0-9]+)?)\s*(mmol\/L|mg\/dL)?/);
  if (!match) return null;
  const rawValue = Number(match[1]);
  if (!Number.isFinite(rawValue)) return null;
  const rawUnit = match[2] ?? '';
  let normalized = rawValue;
  let normalizedUnit = 'mmol/L';
  let conversionNote: string | undefined;
  if (rawUnit === 'mg/dL') {
    normalized = round1(rawValue / 18.0182);
    conversionNote = `mg/dL ${rawValue} → mmol/L ${normalized}`;
  }
  const range = classifyRange(normalized, 3.9, 6.1, 2.8, 16.7);
  return makeVital(
    {
      item: 'blood-glucose',
      values: [normalized],
      rawUnit,
      normalizedUnit,
      sourceText: segment,
      conversionNote,
    },
    range,
  );
}

const PARSERS: Array<(segment: string) => ParsedVital | null> = [
  parseBloodPressure,
  parseHeartRate,
  parseTemperature,
  parseRespiration,
  parseOxygenSaturation,
  parseGlucose,
];

const KNOWN_KEYWORDS = /血压|心率|脉搏|体温|呼吸|血氧|血糖/;

/** 解析语音体征自由文本；未识别片段进入 unrecognized 与 missingInfo */
export function parseVitalsText(text: string): VitalsParseResult {
  const segments = splitSegments(text);
  const vitals: ParsedVital[] = [];
  const unrecognized: string[] = [];
  const missingInfo: string[] = [];

  for (const segment of segments) {
    let matched: ParsedVital | null = null;
    for (const parser of PARSERS) {
      matched = parser(segment);
      if (matched) break;
    }
    if (matched) {
      vitals.push(matched);
      continue;
    }
    unrecognized.push(segment);
    if (KNOWN_KEYWORDS.test(segment)) {
      missingInfo.push(`语音体征片段数值或单位无法识别：${segment}`);
    } else {
      missingInfo.push(`未识别语音片段，已保留原文待人工核对：${segment}`);
    }
  }

  return { vitals, unrecognized, missingInfo };
}
