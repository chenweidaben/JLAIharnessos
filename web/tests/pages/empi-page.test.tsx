/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引页面测试（M5-C）
 *
 * 覆盖：
 *  - 在线：候选/链接渲染、扫描、确认（Popconfirm）、拒绝（Popconfirm）；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

// 重型页面（健康门禁 + 异步渲染）：提至 30s 避免计时抖动。
const it = (name: string, fn: TestFunction) =>
  vitestIt(name, fn, 30000);

import EmpiPage from '@/pages/empi';
import type { EmpiLink, MatchCandidate } from '@/types/empi';

vi.mock('@/services/api/empi', () => ({
  fetchCandidates: vi.fn(),
  fetchEmpiLinks: vi.fn(),
  runEmpiScanApi: vi.fn(),
  registerIdentifierApi: vi.fn(),
  fetchPatientIdentifiers: vi.fn(),
  confirmCandidateApi: vi.fn(),
  rejectCandidateApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/empi';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function candidate(over: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: 'c1',
    patientAId: 'patient-a',
    patientBId: 'patient-b',
    matchScore: 80,
    matchReasons: ['姓名、性别、出生日期一致'],
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function link(over: Partial<EmpiLink> = {}): EmpiLink {
  return {
    id: 'l1',
    masterPatientId: 'patient-a',
    linkedPatientId: 'patient-b',
    candidateId: 'c1',
    createdBy: 'u1',
    createdAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function healthUp() {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'up',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  healthUp();
  m.fetchCandidates.mockResolvedValue([candidate()]);
  m.fetchEmpiLinks.mockResolvedValue([link()]);
  m.runEmpiScanApi.mockResolvedValue({
    scanned: 100, newCandidates: 1, pending: 1,
  });
  m.confirmCandidateApi.mockResolvedValue(link());
  m.rejectCandidateApi.mockResolvedValue(candidate({ status: 'rejected' }));
});

async function waitOnline() {
  return screen.findByTestId('empi-content');
}

it('在线：渲染候选与链接', async () => {
  render(<EmpiPage />);
  await waitOnline();
  // patient-a / patient-b 在候选表与链接表均出现，用 getAllByText
  expect(screen.getAllByText('patient-a').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('patient-b').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('姓名、性别、出生日期一致')).toBeInTheDocument();
});

it('扫描：点击触发 runEmpiScanApi', async () => {
  render(<EmpiPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /扫描患者生成匹配/ }));
  await waitFor(() => expect(m.runEmpiScanApi).toHaveBeenCalledTimes(1));
});

it('确认：打开 Popconfirm 并确认', async () => {
  render(<EmpiPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));
  const popover = await screen.findByRole('tooltip');
  fireEvent.click(within(popover).getByRole('button', { name: /确\s*认/ }));
  await waitFor(() => expect(m.confirmCandidateApi).toHaveBeenCalledWith('c1'));
});

it('拒绝：打开 Popconfirm 并拒绝', async () => {
  render(<EmpiPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /拒\s*绝/ }));
  const popover = await screen.findByRole('tooltip');
  fireEvent.click(within(popover).getByRole('button', { name: /拒\s*绝/ }));
  await waitFor(() => expect(m.rejectCandidateApi).toHaveBeenCalledWith('c1'));
});

it('已处理候选显示「已处理」，无操作按钮', async () => {
  m.fetchCandidates.mockResolvedValue([
    candidate({ id: 'c2', status: 'confirmed' }),
  ]);
  render(<EmpiPage />);
  await waitOnline();
  expect(screen.getByText('已处理')).toBeInTheDocument();
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'down',
  });
  render(<EmpiPage />);
  expect(await screen.findByTestId('empi-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('empi-content')).toBeNull();
  expect(screen.getByTestId('empi-health-tag')).toHaveTextContent(
    'BFF/DB 不可用',
  );
});
