/**
 * 健澜科技 jlmedaios - 病案首页页面测试（M3-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：队列渲染、打开详情、编码保存、第二人质控通过/退回；
 *  - 阻断缺陷门禁：通过按钮禁用，确认+理由后放行；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import FrontPagePage from '@/pages/frontPage';
import type {
  FrontPageDetail,
  FrontPageQueueItem,
} from '@/types/frontPage';

vi.mock('@/services/api/frontPage', () => ({
  fetchFrontPageQueue: vi.fn(),
  fetchFrontPage: vi.fn(),
  saveCoding: vi.fn(),
  submitReview: vi.fn(),
  archiveFrontPage: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/frontPage';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function queueItem(over: Partial<FrontPageQueueItem> = {}): FrontPageQueueItem {
  return {
    pageId: 'fp1', visitId: 'v1', visitNo: 'IP001', patientId: 'p1',
    mrn: 'M001', patientName: '病*甲', department: '心血管内科',
    status: 'coding', version: 2, primaryDiagnosis: '肺恶性肿瘤',
    updatedAt: '2026-09-29T08:00:00Z', ...over,
  };
}
function detail(over: Partial<FrontPageDetail> = {}): FrontPageDetail {
  return {
    page: {
      id: 'fp1', visitId: 'v1', patientId: 'p1', department: '心血管内科',
      status: 'coding', version: 2,
      admitAt: '2026-09-20T08:00:00Z', dischargeAt: '2026-09-27T08:00:00Z',
      ward: null, bedNo: null, primaryDiagnosis: '肺恶性肿瘤', primaryDiagnosisCode: null,
      secondaryDiagnoses: [], operations: [], totalFee: '12000.00',
      codedBy: 'u-admin', codedAt: '2026-09-28T08:00:00Z',
      defects: [], qualityScore: null, archivedBy: null, archivedAt: null,
      createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
    },
    visit: { id: 'v1', visitNo: 'IP001', department: '心血管内科', admitAt: null, dischargeAt: null },
    patient: { mrn: 'M001', nameMasked: '病*甲' },
    reviews: [],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  m.fetchFrontPageQueue.mockResolvedValue({ items: [queueItem()], total: 1 });
  m.fetchFrontPage.mockResolvedValue(detail());
  m.saveCoding.mockResolvedValue({});
  m.submitReview.mockResolvedValue({});
  m.archiveFrontPage.mockResolvedValue({});
});

it('在线：队列渲染 → 打开详情 → 编码保存', async () => {
  render(<FrontPagePage />);

  expect(await screen.findByText('病案首页队列（1）')).toBeInTheDocument();
  expect(screen.getByText('病*甲（M001）')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '处理' }));
  expect(await screen.findByTestId('fp-descriptions')).toBeInTheDocument();

  fireEvent.change(screen.getByTestId('fp-code-input'), {
    target: { value: 'C34.900' },
  });
  fireEvent.click(screen.getByTestId('fp-save-code-btn'));
  await waitFor(() => expect(m.saveCoding).toHaveBeenCalledTimes(1));
});

it('第二人质控：填写意见后通过，提交 pass', async () => {
  render(<FrontPagePage />);
  fireEvent.click(await screen.findByRole('button', { name: '处理' }));
  await screen.findByTestId('fp-review-card');

  fireEvent.change(screen.getByTestId('fp-comment'), {
    target: { value: '首页完整，同意通过' },
  });
  fireEvent.click(screen.getByTestId('fp-pass-btn'));
  await waitFor(() => expect(m.submitReview).toHaveBeenCalledTimes(1));
  expect(m.submitReview.mock.calls[0][1].decision).toBe('pass');
});

it('阻断缺陷门禁：未确认时通过禁用；勾选并填写理由后放行', async () => {
  m.fetchFrontPage.mockResolvedValue(
    detail({
      page: {
        ...detail().page,
        defects: [{ field: 'primaryDiagnosis', severity: 'block', message: '主诊断缺失' }],
      },
    }),
  );
  render(<FrontPagePage />);
  fireEvent.click(await screen.findByRole('button', { name: '处理' }));
  await screen.findByTestId('fp-hard-alert');
  expect(screen.getByTestId('fp-pass-btn')).toBeDisabled();

  fireEvent.click(screen.getByTestId('fp-acknowledge'));
  fireEvent.change(screen.getByTestId('fp-comment'), {
    target: { value: '已复核主诊断，临床判断通过' },
  });
  expect(screen.getByTestId('fp-pass-btn')).toBeEnabled();
  fireEvent.click(screen.getByTestId('fp-pass-btn'));
  await waitFor(() => expect(m.submitReview).toHaveBeenCalledTimes(1));
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<FrontPagePage />);
  expect(await screen.findByTestId('fp-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('fp-content')).toBeNull();
  expect(screen.getByTestId('fp-health-tag')).toHaveTextContent('BFF/DB 不可用');
});
