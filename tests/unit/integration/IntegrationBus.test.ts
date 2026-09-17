/**
 * 健澜科技数智医院智能体 - 集成消息总线单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { IntegrationBus, publishEvent } from '../../../src/integration/middleware/IntegrationBus';
import { IntegrationEventType } from '../../../src/integration/middleware/EventTypes';
import type { IntegrationEvent, LabCriticalValuePayload, PatientAdmittedPayload } from '../../../src/integration';

describe('IntegrationBus', () => {
  let bus: IntegrationBus;

  beforeAll(() => {
    IntegrationBus.reset();
    bus = IntegrationBus.getInstance();
  });

  afterAll(() => {
    IntegrationBus.reset();
  });

  it('应是单例', () => {
    const instance1 = IntegrationBus.getInstance();
    const instance2 = IntegrationBus.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('应能订阅和发布事件', (done) => {
    const unsubscribe = bus.subscribe('test.event', (event) => {
      expect(event.eventType).toBe('test.event');
      expect(event.payload).toEqual({ key: 'value' });
      unsubscribe();
      done();
    });

    bus.publish({
      eventId: 'evt_001',
      eventType: 'test.event',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'medium',
      payload: { key: 'value' },
    });
  });

  it('应能发布危急值事件', (done) => {
    const payload: LabCriticalValuePayload = {
      eventId: 'cv_001',
      patientId: 'P001',
      patientName: '张三',
      reportId: 'RPT001',
      testItemCode: 'CAR001',
      testItemName: '肌钙蛋白I',
      resultValue: '5.8',
      unit: 'ng/mL',
      referenceRange: '0-0.04',
      criticalHigh: '0.5',
      reportedAt: new Date().toISOString(),
      reportedBy: '张检验师',
    };

    const unsubscribe = bus.subscribe(IntegrationEventType.LAB_CRITICAL_VALUE, (event) => {
      expect(event.priority).toBe('critical');
      expect((event.payload as LabCriticalValuePayload).patientId).toBe('P001');
      expect((event.payload as LabCriticalValuePayload).testItemName).toBe('肌钙蛋白I');
      unsubscribe();
      done();
    });

    bus.publish({
      eventId: 'evt_cv_001',
      eventType: IntegrationEventType.LAB_CRITICAL_VALUE,
      source: 'lis-adapter',
      timestamp: new Date().toISOString(),
      priority: 'critical',
      payload,
    });
  });

  it('应能发布患者入院事件', (done) => {
    const payload: PatientAdmittedPayload = {
      patientId: 'P001',
      patientName: '张三',
      encounterId: 'E001',
      department: '心内科',
      admittedAt: new Date().toISOString(),
      encounterType: 'inpatient',
    };

    const unsubscribe = bus.subscribe(IntegrationEventType.PATIENT_ADMITTED, (event) => {
      expect((event.payload as PatientAdmittedPayload).department).toBe('心内科');
      expect((event.payload as PatientAdmittedPayload).encounterType).toBe('inpatient');
      unsubscribe();
      done();
    });

    publishEvent(IntegrationEventType.PATIENT_ADMITTED, 'his-adapter', payload);
  });

  it('应支持通配符订阅', (done) => {
    let callCount = 0;
    const unsubscribe = bus.subscribe('wildcard.*', () => {
      callCount++;
      if (callCount === 2) {
        unsubscribe();
        done();
      }
    });

    bus.publish({
      eventId: 'evt_w1',
      eventType: 'wildcard.event1',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });
    bus.publish({
      eventId: 'evt_w2',
      eventType: 'wildcard.event2',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });
  });

  it('应能取消订阅', () => {
    let callCount = 0;
    const unsubscribe = bus.subscribe('unsubscribe.test', () => {
      callCount++;
    });

    bus.publish({
      eventId: 'evt_us1',
      eventType: 'unsubscribe.test',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });

    unsubscribe();

    bus.publish({
      eventId: 'evt_us2',
      eventType: 'unsubscribe.test',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });

    // 由于异步处理，需要等待
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(callCount).toBe(1);
        resolve(undefined);
      }, 100);
    });
  });

  it('应能获取订阅者数量', () => {
    const unsubscribe = bus.subscribe('subcount.test', () => {});
    expect(bus.getSubscriberCount('subcount.test')).toBe(1);
    expect(bus.getSubscriberCount('nonexistent')).toBe(0);
    unsubscribe();
  });

  it('应能获取统计信息', () => {
    bus.publish({
      eventId: 'evt_stats',
      eventType: 'stats.test',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });
    const stats = bus.getStats();
    expect(stats.totalPublished).toBeGreaterThan(0);
    expect(stats.eventsByType['stats.test']).toBe(1);
  });

  it('publishAndWait应等待所有订阅者完成', async () => {
    let completed = false;
    bus.subscribe('wait.test', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      completed = true;
    });

    const results = await bus.publishAndWait({
      eventId: 'evt_wait',
      eventType: 'wait.test',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });

    expect(completed).toBe(true);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('应处理订阅者错误', async () => {
    bus.subscribe('error.test', () => {
      throw new Error('处理失败');
    });

    const results = await bus.publishAndWait({
      eventId: 'evt_error',
      eventType: 'error.test',
      source: 'test',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: {},
    });

    expect(results.some((r) => !r.success)).toBe(true);
  });

  it('publishEvent便捷函数应能发布事件', (done) => {
    const unsubscribe = bus.subscribe('convenience.test', (event) => {
      expect(event.source).toBe('test-source');
      expect(event.payload).toEqual({ data: 'test' });
      unsubscribe();
      done();
    });

    publishEvent('convenience.test', 'test-source', { data: 'test' }, 'medium');
  });
});
