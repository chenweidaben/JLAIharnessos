/**
 * 健澜科技 jlmedaios - 物联网纯函数单测（M215-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessIoTConnectivity,
  buildIoTReport,
  predictEquipmentFailure,
  type SensorData,
} from '../../src/bff/aggregators/iotReportAggregator';

describe('assessIoTConnectivity', () => {
  it('990 / 1000 → 99% 优秀', () => {
    const r = assessIoTConnectivity(1000, 990);
    expect(r.level).toBe('优秀');
  });

  it('850 / 1000 → 85% 不达标', () => {
    const r = assessIoTConnectivity(1000, 850);
    expect(r.level).toBe('不达标');
  });
});

describe('predictEquipmentFailure', () => {
  it('振动 8 温度 80 → 高故障概率', () => {
    const s: SensorData = { vibration: 8, temperature: 80 };
    const r = predictEquipmentFailure(s);
    expect(r.alert).toBe(true);
  });

  it('振动 2 温度 30 → 低故障概率', () => {
    const s: SensorData = { vibration: 2, temperature: 30 };
    const r = predictEquipmentFailure(s);
    expect(r.alert).toBe(false);
  });
});

describe('buildIoTReport', () => {
  it('生成设备接入数据', () => {
    const r = buildIoTReport('30d');
    expect(r.deviceOnboarding.medical).toBeGreaterThan(0);
  });

  it('生成定位数据', () => {
    const r = buildIoTReport('30d');
    expect(r.rtls.people).toBeGreaterThan(0);
  });

  it('生成预测维护数据', () => {
    const r = buildIoTReport('30d');
    expect(r.predictive.maintenance).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildIoTReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
