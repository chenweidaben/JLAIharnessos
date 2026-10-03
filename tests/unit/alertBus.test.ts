/**
 * 健澜科技 jlmedaios - 危急值告警总线单元测试（M7-B）
 *
 * 验证：
 *  - buildCriticalAlertPayload 构造对齐前端 Alert 契约的 payload（id 稳定、字段齐全）；
 *  - emitCriticalValueAlert / emitCriticalStatus 通过注入的 sink 推送正确事件；
 *  - 无 sink 时静默不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';
import {
  setCriticalAlertSink,
  buildCriticalAlertPayload,
  emitCriticalValueAlert,
  emitCriticalStatus,
  type CriticalValueEventInput,
} from '../../src/bff/alertBus.js';

const sample: CriticalValueEventInput = {
  id: 'alert-uuid-123',
  visitId: 'visit-uuid-1',
  patientId: 'patient-uuid-1',
  patientName: '张**',
  department: '心内科',
  itemName: '肌钙蛋白I',
  value: '0.85',
  unit: 'ng/mL',
  refLow: '0.00',
  refHigh: '0.04',
  status: 'raised',
  raisedAt: '2026-10-03T10:00:00.000Z',
};

const captured: { event: string; payload: unknown }[] = [];

function installCapturingSink() {
  captured.length = 0;
  setCriticalAlertSink((event, payload) => {
    captured.push({ event, payload });
  });
}

afterEach(() => {
  setCriticalAlertSink(null);
});

describe('M7-B alertBus 危急值告警总线', () => {
  it('buildCriticalAlertPayload：对齐前端 Alert 契约，id 稳定且字段齐全', () => {
    const p = buildCriticalAlertPayload(sample);
    expect(p.id).toBe('alert-uuid-123');
    expect(p.type).toBe('critical-value');
    expect(p.level).toBe('critical');
    expect(p.title).toBe('肌钙蛋白I危急值');
    expect(p.patientId).toBe('patient-uuid-1');
    expect(p.patientName).toBe('张**');
    expect(p.acknowledged).toBe(false);
    expect(p.createdAt).toBe('2026-10-03T10:00:00.000Z');
    // 内容含数值、单位与参考范围
    expect(p.content).toContain('0.85');
    expect(p.content).toContain('ng/mL');
    expect(p.content).toContain('0.04');
    // 业务字段
    expect(p.visitId).toBe('visit-uuid-1');
    expect(p.department).toBe('心内科');
    expect(p.status).toBe('raised');
  });

  it('buildCriticalAlertPayload：同一输入多次构造 id 完全一致（去重基础）', () => {
    const a = buildCriticalAlertPayload(sample);
    const b = buildCriticalAlertPayload(sample);
    expect(a.id).toBe(b.id);
  });

  it('buildCriticalAlertPayload：缺参考范围时不拼接，仍可构造', () => {
    const p = buildCriticalAlertPayload({ ...sample, refLow: null, refHigh: null });
    expect(p.content).not.toContain('参考范围');
    expect(p.content).toContain('0.85');
  });

  it('emitCriticalValueAlert：通过 sink 推送 critical:alert 与统一 payload', () => {
    installCapturingSink();
    emitCriticalValueAlert(sample);
    expect(captured.length).toBe(1);
    expect(captured[0].event).toBe('critical:alert');
    const p = captured[0].payload as Record<string, unknown>;
    expect(p.id).toBe('alert-uuid-123');
    expect(p.title).toBe('肌钙蛋白I危急值');
  });

  it('emitCriticalStatus：签收推送 critical:status=acked', () => {
    installCapturingSink();
    emitCriticalStatus('alert-uuid-123', 'acked', { actedBy: 'doctor-1' });
    expect(captured.length).toBe(1);
    expect(captured[0].event).toBe('critical:status');
    const p = captured[0].payload as Record<string, unknown>;
    expect(p.id).toBe('alert-uuid-123');
    expect(p.status).toBe('acked');
    expect(p.actedBy).toBe('doctor-1');
  });

  it('emitCriticalStatus：处置推送 critical:status=resolved 并带 note', () => {
    installCapturingSink();
    emitCriticalStatus('alert-uuid-123', 'resolved', { actedBy: 'doctor-1', note: '已复查心电图' });
    const p = captured[0].payload as Record<string, unknown>;
    expect(p.status).toBe('resolved');
    expect(p.note).toBe('已复查心电图');
    expect(p.at).toBeTruthy();
  });

  it('无 sink 时推送静默不抛错（不影响业务主流程）', () => {
    setCriticalAlertSink(null);
    const before = captured.length;
    expect(() => emitCriticalValueAlert(sample)).not.toThrow();
    expect(() => emitCriticalStatus('x', 'acked')).not.toThrow();
    expect(captured.length).toBe(before); // 无 sink 不产生新事件
  });

  it('sink 抛错时推送被吞，不影响主流程', () => {
    setCriticalAlertSink(() => {
      throw new Error('boom');
    });
    expect(() => emitCriticalValueAlert(sample)).not.toThrow();
  });
});
