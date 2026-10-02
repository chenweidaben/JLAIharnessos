/**
 * 健澜科技 jlmedaios - 运行病历质控页面测试（M2-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：队列渲染、打开质控详情、规则检查、无缺陷通过、退回整改；
 *  - 阻断缺陷门禁：通过按钮禁用，确认+理由后放行；
 *  - 作者整改重提按钮；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import MedicalQcPage from '@/pages/medicalQc';
import type {
  QcCheckResult,
  QcQueueItem,
  QcRecordDetail,
} from '@/types/medicalQc';
import type { AuthUser } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/services/api/medicalQc', () => ({
  fetchQcQueue: vi.fn(),
  fetchQcRecord: vi.fn(),
  checkQc: vi.fn(),
  submitQc: vi.fn(),
  resubmitQc: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/medicalQc';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function queueItem(over: Partial<QcQueueItem> = {}): QcQueueItem {
  return {
    recordId: 'rec1', recordType: 'outpatient', title: '门诊病历',
    status: 'submitted', nextLevel: 1, department: '心血管内科',
    visitNo: 'V001', mrn: 'M2B001', patientName: '控*甲',
    updatedAt: '2026-09-27T08:00:00Z', ...over,
  };
}
function detail(over: Partial<QcRecordDetail> = {}): QcRecordDetail {
  return {
    record: {
      id: 'rec1', visitId: 'v1', recordType: 'outpatient', title: '门诊病历',
      content: { chiefComplaint: '胸闷' }, plainText: 'chiefComplaint: 胸闷',
      authorId: 'doc1', aiGenerated: false, aiModel: null, status: 'submitted',
      qualityScore: null, qualityIssues: [], signedAt: null, signedBy: null,
      version: 1, createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
    },
    visit: {
      id: 'v1', visitNo: 'V001', department: '心血管内科',
      admitAt: null, dischargeAt: null,
    },
    patient: { mrn: 'M2B001', nameMasked: '控*甲' },
    reviews: [], nextLevel: 1,
    latestRule: {
      issues: [], score: 100, canPass: true,
      blockCount: 0, majorCount: 0, minorCount: 0,
    },
    ...over,
  };
}
function cleanCheck(): QcCheckResult {
  return {
    rule: {
      issues: [], score: 100, canPass: true,
      blockCount: 0, majorCount: 0, minorCount: 0,
    },
    ai: { issues: [], model: 'deepseek-chat', error: null },
    issues: [], score: 100, canPass: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  m.fetchQcQueue.mockResolvedValue({ items: [queueItem()], total: 1 });
  m.fetchQcRecord.mockResolvedValue(detail());
  m.checkQc.mockResolvedValue(cleanCheck());
  m.submitQc.mockResolvedValue({});
  m.resubmitQc.mockResolvedValue({});
  useAuthStore.setState({ user: null });
});

it('在线：队列渲染 → 打开详情 → 规则检查无缺陷 → 质控通过', async () => {
  render(<MedicalQcPage />);

  expect(await screen.findByText('待质控病历（1）')).toBeInTheDocument();
  expect(screen.getByText('控*甲（M2B001）')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '质控处理' }));
  expect(await screen.findByText('病历质控处理')).toBeInTheDocument();
  expect(screen.getByTestId('qc-plain-text')).toHaveTextContent('chiefComplaint: 胸闷');

  fireEvent.click(screen.getByRole('button', { name: '规则检查' }));
  expect(await screen.findByText('未发现缺陷，建议质控通过')).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('qc-pass-btn'));
  await waitFor(() => expect(m.submitQc).toHaveBeenCalledTimes(1));
  const payload = m.submitQc.mock.calls[0][1];
  expect(payload.decision).toBe('pass');
}, 30000);

it('退回整改：填写意见后退回，提交 return', async () => {
  render(<MedicalQcPage />);
  fireEvent.click(await screen.findByRole('button', { name: '质控处理' }));
  await screen.findByText('病历质控处理');

  fireEvent.change(screen.getByTestId('qc-comment'), {
    target: { value: '现病史不完整，请补充' },
  });
  fireEvent.click(screen.getByRole('button', { name: '退回整改' }));
  await waitFor(() => expect(m.submitQc).toHaveBeenCalledTimes(1));
  expect(m.submitQc.mock.calls[0][1].decision).toBe('return');
});

it('阻断缺陷门禁：未确认时通过禁用；勾选并填写理由后放行', async () => {
  const blockIssue = {
    ruleId: 'outpatient.diagnosis.missing', category: 'completeness' as const,
    severity: 'block' as const, message: '缺少必备段落：诊断', source: 'rule' as const,
  };
  m.checkQc.mockResolvedValue({
    ...cleanCheck(),
    rule: {
      issues: [blockIssue], score: 85, canPass: false,
      blockCount: 1, majorCount: 0, minorCount: 0,
    },
    issues: [blockIssue], canPass: false, score: 85,
  });

  render(<MedicalQcPage />);
  fireEvent.click(await screen.findByRole('button', { name: '质控处理' }));
  await screen.findByText('病历质控处理');
  fireEvent.click(screen.getByRole('button', { name: '规则检查' }));

  expect(await screen.findByTestId('qc-hard-alert')).toBeInTheDocument();
  expect(screen.getByTestId('qc-pass-btn')).toBeDisabled();

  fireEvent.click(screen.getByTestId('qc-acknowledge'));
  fireEvent.change(screen.getByTestId('qc-comment'), {
    target: { value: '已电话确认诊断，临床判断通过' },
  });
  expect(screen.getByTestId('qc-pass-btn')).toBeEnabled();
  fireEvent.click(screen.getByTestId('qc-pass-btn'));
  await waitFor(() => expect(m.submitQc).toHaveBeenCalledTimes(1));
});

it('作者视角：退回状态显示整改重提按钮并可提交', async () => {
  useAuthStore.setState({ user: { id: 'doc1' } as AuthUser });
  m.fetchQcQueue.mockResolvedValue({
    items: [queueItem({ status: 'returned' })], total: 1,
  });
  m.fetchQcRecord.mockResolvedValue(
    detail({
      record: { ...detail().record, status: 'returned' },
    }),
  );

  render(<MedicalQcPage />);
  fireEvent.click(await screen.findByRole('button', { name: '质控处理' }));
  const btn = await screen.findByTestId('qc-resubmit-btn');
  fireEvent.click(btn);
  await waitFor(() => expect(m.resubmitQc).toHaveBeenCalledTimes(1));
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<MedicalQcPage />);
  expect(await screen.findByTestId('qc-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('qc-content')).toBeNull();
  expect(screen.getByTestId('qc-health-tag')).toHaveTextContent('BFF/DB 不可用');
});