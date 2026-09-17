/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { SessionManager } from '@/core/session/SessionManager';
import { MedicalSessionModel } from '@/core/session/MedicalSession';

let tmpDir = '';

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jl-sess-test-'));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SessionManager', () => {
  test('创建并恢复会话', async () => {
    const mgr = new SessionManager({ storageDir: tmpDir });
    const s = await mgr.createSession({
      sessionType: 'outpatient_consultation',
      userId: 'u1',
      department: 'cardiology',
      patientId: 'P1',
    });
    s.appendMessage('user', '你好');

    const restored = await mgr.getSession(s.sessionId);
    expect(restored).toBeDefined();
    expect(restored!.messages).toHaveLength(1);
    expect(restored!.patientId).toBe('P1');
  });

  test('按患者搜索会话', async () => {
    const mgr = new SessionManager({ storageDir: tmpDir });
    await mgr.createSession({
      sessionType: 'ward_round',
      userId: 'u1',
      department: 'cardiology',
      patientId: 'P2',
    });
    const results = await mgr.search({ patientId: 'P2' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.patientId === 'P2')).toBe(true);
  });

  test('完成与会话归档', async () => {
    const mgr = new SessionManager({ storageDir: tmpDir });
    const s = await mgr.createSession({
      sessionType: 'admin',
      userId: 'u1',
      department: 'admin',
    });
    await mgr.completeSession(s.sessionId);
    let restored = await mgr.requireSession(s.sessionId);
    expect(restored.status).toBe('completed');

    await mgr.archiveSession(s.sessionId);
    restored = await mgr.requireSession(s.sessionId);
    expect(restored.status).toBe('archived');
  });
});

describe('MedicalSessionModel', () => {
  test('分页获取消息', () => {
    const s = new MedicalSessionModel({
      sessionType: 'teaching_training',
      userId: 'u1',
      department: 'internal',
    });
    for (let i = 0; i < 5; i++) s.appendMessage('user', `m${i}`);
    const page1 = s.getMessagesPage(1, 2);
    expect(page1).toHaveLength(2);
    expect(page1[0].content).toBe('m0');
    const page3 = s.getMessagesPage(3, 2);
    expect(page3).toHaveLength(1);
  });

  test('序列化与反序列化', () => {
    const s = new MedicalSessionModel({
      sessionType: 'emergency',
      userId: 'u1',
      department: 'er',
      title: '急诊1',
    });
    s.appendMessage('assistant', '响应');
    const data = s.toData();
    const restored = MedicalSessionModel.fromData(data);
    expect(restored.sessionId).toBe(s.sessionId);
    expect(restored.title).toBe('急诊1');
    expect(restored.messages).toHaveLength(1);
  });
});
