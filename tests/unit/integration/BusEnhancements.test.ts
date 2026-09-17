/**
 * 健澜科技数智医院智能体 - 集成总线增强与新增Mock能力测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { IntegrationBus } from '../../../src/integration/middleware/IntegrationBus';
import { HISMockAdapter } from '../../../src/integration/adapters/his/HISMockAdapter';
import { LISMockAdapter } from '../../../src/integration/adapters/lis/LISMockAdapter';
import { PACSMockAdapter } from '../../../src/integration/adapters/pacs/PACSMockAdapter';

describe('IntegrationBus 增强', () => {
  beforeEach(() => {
    IntegrationBus.reset();
  });

  it('失败重试耗尽应进入死信队列', async () => {
    const bus = IntegrationBus.getInstance();
    let calls = 0;
    bus.subscribe('test.dlq', async () => {
      calls++;
      throw new Error('fail');
    }, { maxRetries: 1 });

    await bus.publishAndWait({
      eventId: 'e1',
      eventType: 'test.dlq',
      source: 't',
      timestamp: new Date().toISOString(),
      priority: 'high',
      payload: {},
    });
    expect(calls).toBe(2); // 首次 + 重试1次
    expect(bus.getDeadLetters().length).toBe(1);
  });

  it('应持久化已发布消息', async () => {
    const bus = IntegrationBus.getInstance();
    bus.publish({
      eventId: 'p1',
      eventType: 'sys.hello',
      source: 't',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: { a: 1 },
    });
    const persisted = bus.getPersistedMessages(10);
    expect(persisted.some((e) => e.eventId === 'p1')).toBe(true);
  });

  it('应支持延迟投递', async () => {
    const bus = IntegrationBus.getInstance();
    const received: string[] = [];
    bus.subscribe('test.delay', (e) => { received.push((e.payload as { v: string }).v); });
    const timer = bus.publishDelayed({
      eventId: 'd1',
      eventType: 'test.delay',
      source: 't',
      timestamp: new Date().toISOString(),
      priority: 'low',
      payload: { v: 'late' },
    }, 30);
    expect(received).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 80));
    expect(received).toContain('late');
    bus.cancelDelayed(timer);
  });
});

describe('HISMockAdapter 增强能力', () => {
  it('应支持批量查询与批量下达', async () => {
    const adapter = new HISMockAdapter({ patientCount: 20 });
    await adapter.init();
    await adapter.connect();
    const { patients, notFound } = await adapter.batchGetPatients(['P20240001', 'P20240002', 'NOPE']);
    expect(patients.length).toBe(2);
    expect(notFound).toEqual(['NOPE']);

    const result = await adapter.batchCreateOrders([
      { patientId: 'P20240001', orderType: 'drug', orderName: '阿莫西林', dosage: '0.5g', frequency: 'TID', route: '口服', orderedBy: '王医生', orderedById: 'D001' },
      { patientId: 'P20240001', orderType: 'lab', orderName: '血常规', orderedBy: '王医生', orderedById: 'D001' },
    ]);
    expect(result.total).toBe(2);
    expect(result.succeeded.length).toBe(2);
  });

  it('应支持异步下达医嘱并查询任务', async () => {
    const adapter = new HISMockAdapter();
    await adapter.init();
    const { taskId } = await adapter.placeOrderAsync({ patientId: 'P1', orderType: 'drug', orderName: 'x', orderedBy: 'd', orderedById: 'D001' });
    await new Promise((r) => setTimeout(r, 120));
    const task = await adapter.getAsyncTaskStatus(taskId);
    expect(task.status).toBe('completed');
  });

  it('应支持危急值事件订阅', async () => {
    const adapter = new HISMockAdapter();
    await adapter.init();
    let pushed = false;
    adapter.onCriticalValue(() => { pushed = true; });
    adapter.emitCriticalValue({
      eventId: 'cv1', patientId: 'P1', testItemName: '肌钙蛋白', resultValue: '5.8', unit: 'ng/mL',
      reportedAt: new Date().toISOString(),
    });
    expect(pushed).toBe(true);
  });
});

describe('LISMockAdapter 增强能力', () => {
  it('目录应包含30项以上', async () => {
    const adapter = new LISMockAdapter();
    await adapter.init();
    const catalog = await adapter.getTestCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(30);
  });

  it('应支持5份以上种子报告', async () => {
    const adapter = new LISMockAdapter();
    await adapter.init();
    const r1 = await adapter.getLabResult('RPT000001');
    expect(r1.reportId).toBe('RPT000001');
    const r4 = await adapter.getLabResult('RPT000004');
    expect(r4).toBeTruthy();
    const r5 = await adapter.getLabResult('RPT000005');
    expect(r5).toBeTruthy();
  });

  it('应构建并解析 HL7 ORM/ORU', async () => {
    const adapter = new LISMockAdapter();
    await adapter.init();
    const orm = await adapter.buildOrderHL7Message({
      patientId: 'P1', encounterId: 'E1', urgency: 'routine', orderedBy: '王医生', orderedById: 'D1',
      testItems: [{ itemCode: 'WBC', itemName: '白细胞' }],
    });
    expect(orm).toContain('ORM^O01');
    const oru = `MSH|^~\\&|LIS|H|JIANLAN|H||20240615T103000||ORU^R01|R1|P|2.5\rPID|||P1||张三\rOBR|1||L1|WBC^白细胞|||20240615T103000||F\rOBX|1|NM|WBC^白细胞||6.5|10^9/L|3.5-9.5|N|F`;
    const report = await adapter.parseResultHL7Message(oru);
    expect(report.patientId).toBe('P1');
    expect(report.results[0].resultValue).toBe('6.5');
  });
});

describe('PACSMockAdapter 增强能力', () => {
  it('应支持5份以上影像报告', async () => {
    const adapter = new PACSMockAdapter();
    await adapter.init();
    const r4 = await adapter.getImageReport('IMG000004');
    expect(r4.reportId).toBe('IMG000004');
    const r5 = await adapter.getImageReport('IMG000005');
    expect(r5).toBeTruthy();
  });

  it('应提供 Viewer URL 与 C-MOVE/C-STORE', async () => {
    const adapter = new PACSMockAdapter();
    await adapter.init();
    expect(adapter.getViewerUrl('1.2.3', 'ohif')).toContain('ohif');
    expect(adapter.getViewerUrl('1.2.3', 'cornerstone')).toContain('cornerstone');
    const move = await adapter.retrieveStudy('1.2.3');
    expect(move.transferred).toBeGreaterThan(0);
    const store = await adapter.storeInstance(Buffer.from('x'));
    expect(store.sopInstanceUid).toBeTruthy();
  });
});
