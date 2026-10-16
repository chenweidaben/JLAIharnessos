/**
 * 健澜科技 jlmedaios - 物联网平台纯函数单测（M196-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildIoTPlatformReport,
  monitorDeviceHealth,
  predictDeviceFailure,
  type DeviceData,
  type DeviceFailureData,
} from '../../src/bff/aggregators/iotPlatformAggregator';

describe('monitorDeviceHealth', () => {
  it('在线+电量足+无错误 → healthy', () => {
    const device: DeviceData = { deviceId: 'd1', online: true, batteryLevel: 90, errorCount: 0, temperature: 30 };
    expect(monitorDeviceHealth(device).status).toBe('healthy');
  });

  it('离线 → critical', () => {
    const device: DeviceData = { deviceId: 'd1', online: false, batteryLevel: 10, errorCount: 10, temperature: 70 };
    expect(monitorDeviceHealth(device).status).toBe('critical');
  });
});

describe('predictDeviceFailure', () => {
  it('高错误率+久未保养 → 高风险', () => {
    const data: DeviceFailureData = { usageHours: 5000, errorRate: 0.15, lastMaintenanceDays: 400 };
    expect(predictDeviceFailure(data).risk).toBe('high');
  });

  it('正常 → 低风险', () => {
    const data: DeviceFailureData = { usageHours: 1000, errorRate: 0.01, lastMaintenanceDays: 30 };
    expect(predictDeviceFailure(data).risk).toBe('low');
  });
});

describe('buildIoTPlatformReport', () => {
  it('生成设备数据', () => {
    const r = buildIoTPlatformReport('30d');
    expect(r.devices.medical).toBeGreaterThan(0);
  });

  it('生成状态数据', () => {
    const r = buildIoTPlatformReport('30d');
    expect(r.status.onlineRate).toBeGreaterThan(0);
  });

  it('生成应用数据', () => {
    const r = buildIoTPlatformReport('30d');
    expect(r.applications.smartWard).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildIoTPlatformReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
