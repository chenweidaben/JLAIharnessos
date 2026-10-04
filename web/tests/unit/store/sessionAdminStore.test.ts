/* ============================================================================
 * 健澜科技杠OS - 会话管理 store 单测（M7-F）
 *
 * 覆盖：健康门禁、列表加载、按 jti / user_id 强制下线、错误分支、清错。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionAdminStore } from '@/store/sessionAdminStore';
import type { ActiveSession } from '@/types/session';

vi.mock('@/services/api/session', () => ({
  fetchActiveSessions: vi.fn(),
  revokeSessionByJti: vi.fn(),
  forceUserOffline: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import {
  fetchActiveSessions,
  revokeSessionByJti,
  forceUserOffline,
} from '@/services/api/session';
import { getSystemHealth } from '@/services/api/pharmacy';

function s(over: Partial<ActiveSession> = {}): ActiveSession {
  return {
    jti: 'jti-1',
    userId: 'user-1',
    issuedAt: '2026-10-03T08:00:00Z',
    accessExpiresAt: '2026-10-03T10:00:00Z',
    ip: '127.0.0.1',
    userAgent: 'vitest',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionAdminStore.setState({
    dbUp: false,
    healthChecking: false,
    sessions: [],
    loading: false,
    acting: false,
    error: null,
  });
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.7.0',
    demoMode: false,
    db: 'up',
  });
  vi.mocked(fetchActiveSessions).mockResolvedValue([s()]);
  vi.mocked(revokeSessionByJti).mockResolvedValue({ revoked: 1 });
  vi.mocked(forceUserOffline).mockResolvedValue({ revoked: 2 });
});

describe('sessionAdminStore', () => {
  it('checkHealth：db up 返回 true', async () => {
    const up = await useSessionAdminStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useSessionAdminStore.getState().dbUp).toBe(true);
  });

  it('checkHealth：db down 返回 false', async () => {
    vi.mocked(getSystemHealth).mockResolvedValue({
      status: 'ok',
      version: '0.7.0',
      demoMode: false,
      db: 'down',
    });
    const up = await useSessionAdminStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useSessionAdminStore.getState().dbUp).toBe(false);
  });

  it('checkHealth：探活抛错返回 false 并写 error', async () => {
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('network down'));
    const up = await useSessionAdminStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useSessionAdminStore.getState().error).toContain('network down');
  });

  it('loadSessions：拉取列表并写入', async () => {
    await useSessionAdminStore.getState().loadSessions();
    expect(useSessionAdminStore.getState().sessions).toHaveLength(1);
    expect(useSessionAdminStore.getState().loading).toBe(false);
  });

  it('loadSessions：带 userId 透传', async () => {
    await useSessionAdminStore.getState().loadSessions('user-9');
    expect(fetchActiveSessions).toHaveBeenCalledWith('user-9');
  });

  it('loadSessions：失败写 error 且不抛', async () => {
    vi.mocked(fetchActiveSessions).mockRejectedValueOnce(new Error('refused'));
    await useSessionAdminStore.getState().loadSessions();
    expect(useSessionAdminStore.getState().error).toContain('refused');
    expect(useSessionAdminStore.getState().loading).toBe(false);
  });

  it('revokeByJti：成功后刷新列表并返回 true', async () => {
    const ok = await useSessionAdminStore.getState().revokeByJti('jti-1');
    expect(ok).toBe(true);
    expect(revokeSessionByJti).toHaveBeenCalledWith('jti-1');
    expect(fetchActiveSessions).toHaveBeenCalled();
  });

  it('revokeByJti：失败返回 false 并写 error', async () => {
    vi.mocked(revokeSessionByJti).mockRejectedValueOnce(new Error('boom'));
    const ok = await useSessionAdminStore.getState().revokeByJti('jti-x');
    expect(ok).toBe(false);
    expect(useSessionAdminStore.getState().error).toContain('boom');
  });

  it('forceOffline：按 userId 吊销、刷新并返回 true', async () => {
    const ok = await useSessionAdminStore.getState().forceOffline('user-1');
    expect(ok).toBe(true);
    expect(forceUserOffline).toHaveBeenCalledWith('user-1');
    expect(fetchActiveSessions).toHaveBeenCalled();
  });

  it('forceOffline：失败返回 false 并写 error', async () => {
    vi.mocked(forceUserOffline).mockRejectedValueOnce(new Error('denied'));
    const ok = await useSessionAdminStore.getState().forceOffline('user-x');
    expect(ok).toBe(false);
    expect(useSessionAdminStore.getState().error).toContain('denied');
  });

  it('clearError：清空错误', async () => {
    vi.mocked(fetchActiveSessions).mockRejectedValueOnce(new Error('x'));
    await useSessionAdminStore.getState().loadSessions();
    expect(useSessionAdminStore.getState().error).not.toBeNull();
    useSessionAdminStore.getState().clearError();
    expect(useSessionAdminStore.getState().error).toBeNull();
  });
});
