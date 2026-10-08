/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）工作站页面测试（M14-A / M14A_TEST）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：在线健康标签 + 目录/授权/待审批加载；处方权限授予；权限入口隐藏；特殊使用级批准；
 * 围术期实时预检 + 后端 CDS；专项点评签名；不合理看板；质控分子分母；断库离线 Alert。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 权限另有 HTTP 端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import AmsPage from '@/pages/ams';
import { useAuthStore } from '@/store/authStore';
import { useAmsStore } from '@/store/amsStore';
import type {
  AmxReview,
  AntibioticCatalogItem,
  PrescriberGrant,
  SpecialApproval,
} from '@/types/ams';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/ams', () => ({
  listCatalog: vi.fn(),
  listPrescribers: vi.fn(),
  grantPrescriber: vi.fn(),
  createSpecialApproval: vi.fn(),
  listSpecialApprovals: vi.fn(),
  approveSpecialApproval: vi.fn(),
  rejectSpecialApproval: vi.fn(),
  createReview: vi.fn(),
  listReviews: vi.fn(),
  signReview: vi.fn(),
  returnReview: vi.fn(),
  recordUsage: vi.fn(),
  listUsage: vi.fn(),
  getAmsMetrics: vi.fn(),
  checkRules: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/ams';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function catalogItem(over: Partial<AntibioticCatalogItem> = {}): AntibioticCatalogItem {
  return {
    id: 'c1',
    drugId: 'd1',
    genericName: '头孢呋辛',
    atcLevel: 'restricted',
    pharmClass: 'cephalosporin_2',
    ddd: 3.0,
    dddUnit: 'g',
    defaultRoute: 'ivgtt',
    ...over,
  };
}
function grant(over: Partial<PrescriberGrant> = {}): PrescriberGrant {
  return {
    id: 'g1',
    prescriberId: 'u-doc-0001',
    prescriberName: '周医生',
    title: '主治医师',
    maxLevel: 'restricted',
    status: 'active',
    grantedBy: null,
    grantedAt: '2026-10-01T08:00:00.000Z',
    expiresAt: null,
    ...over,
  };
}
function approval(over: Partial<SpecialApproval> = {}): SpecialApproval {
  return {
    id: 'sa1',
    approvalNo: 'SA-2026-0001',
    visitId: 'v1',
    patientId: 'p1',
    patientName: '李四',
    prescriberId: 'u-doc',
    drugId: 'd-imipenem',
    drugName: '亚胺培南',
    indication: '重症感染',
    consultationOpinion: null,
    consultantId: null,
    approverId: null,
    status: 'pending',
    orderId: null,
    rejectReason: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    approvedAt: null,
    ...over,
  };
}
function review(over: Partial<AmxReview> = {}): AmxReview {
  return {
    id: 'r1',
    reviewNo: 'AR-2026-0001',
    reviewType: 'order',
    targetId: null,
    visitId: 'v1',
    patientId: 'p1',
    patientName: '王五',
    result: 'irrational',
    issueTypes: ['overdose'],
    detail: {},
    status: 'pending_review',
    reviewerId: null,
    reviewNote: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    reviewedAt: null,
    ...over,
  };
}

function activePanel(): HTMLElement {
  return document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
}
async function switchTab(label: string) {
  fireEvent.click(await screen.findByText(label, { selector: '.ant-tabs-tab-btn' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['*'] });
  useAmsStore.setState({ reviews: [], irrationalReviews: [], pendingApprovals: [], catalog: [], prescribers: [], metrics: null, error: null });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listCatalog.mockResolvedValue([catalogItem()]);
  m.listPrescribers.mockResolvedValue([grant()]);
  m.listSpecialApprovals.mockResolvedValue([approval()]);
  m.grantPrescriber.mockImplementation(async (body: unknown) => grant({ id: 'g1', ...(body as object) }));
  m.approveSpecialApproval.mockResolvedValue(approval({ status: 'approved' }));
  m.rejectSpecialApproval.mockResolvedValue(approval({ status: 'rejected' }));
  m.signReview.mockResolvedValue(review({ status: 'signed' }));
  m.returnReview.mockResolvedValue(review({ status: 'returned' }));
  m.checkRules.mockResolvedValue({ rational: false, issues: ['wrong_timing'], detail: {} });
  m.getAmsMetrics.mockResolvedValue({
    period: { from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' },
    metrics: {
      outpatientAbxRate: 25,
      inpatientAbxRate: 60,
      aud: 40,
      classIProphylaxisRate: 90,
      timingAppropriateRate: 85,
      durationComplianceRate: 88,
      specialShare: 10,
      cultureRate: 75,
      fractions: {
        outpatientAbxRate: { numerator: 25, denominator: 100 },
        inpatientAbxRate: { numerator: 60, denominator: 100 },
        aud: { numerator: 800, denominator: 1000 },
        classIProphylaxisRate: { numerator: 18, denominator: 20 },
        timingAppropriateRate: { numerator: 9, denominator: 10 },
        durationComplianceRate: { numerator: 8, denominator: 10 },
        specialShare: { numerator: 80, denominator: 800 },
        cultureRate: { numerator: 15, denominator: 20 },
      },
    },
  });
});

it('在线：健康标签 + 目录/授权/待审批加载', async () => {
  render(<AmsPage />);
  expect(await screen.findByTestId('ams-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(m.listCatalog).toHaveBeenCalled());
  await waitFor(() => expect(m.listPrescribers).toHaveBeenCalled());
  await waitFor(() => expect(m.listSpecialApprovals).toHaveBeenCalled());
});

it('处方权限：目录渲染 + 授予权限（* 权限）', async () => {
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  // 默认即在"处方权限"Tab
  const panel = activePanel();
  expect(within(panel).getByText('头孢呋辛')).toBeTruthy();
  fireEvent.change(within(panel).getByTestId('ams-grant-prescriber'), { target: { value: 'u-new-doc' } });
  fireEvent.click(within(panel).getByTestId('ams-grant-submit'));
  await waitFor(() =>
    expect(m.grantPrescriber).toHaveBeenCalledWith(
      expect.objectContaining({ prescriberId: 'u-new-doc', maxLevel: 'unrestricted' }),
    ),
  );
});

it('权限：无 ams:audit 时授予按钮隐藏', async () => {
  useAuthStore.setState({ permissions: ['ams:read'] });
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  expect(screen.queryByTestId('ams-grant-submit')).toBeNull();
});

it('待审批特殊使用级：批准按钮调 approveSpecial', async () => {
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('待审批特殊使用级');
  const btn = await screen.findByTestId('ams-approve-btn');
  fireEvent.click(btn);
  await waitFor(() => expect(m.approveSpecialApproval).toHaveBeenCalled());
});

it('围术期：默认合理，改时机后实时判不合理', async () => {
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('围术期点评');
  const panel = activePanel();
  // 默认 I 类 + 一代头孢 + 切皮前30min + 24h => 合理
  expect(within(panel).getByTestId('ams-peri-live')).toHaveTextContent('合理');
  // 切皮前 10min => 时机不当
  fireEvent.change(within(panel).getByTestId('ams-peri-timing'), { target: { value: '10' } });
  await waitFor(() => expect(within(panel).getByTestId('ams-peri-live')).toHaveTextContent('不合理'));
});

it('围术期：后端规则预检(CDS)按钮调 checkRules 并展示结果', async () => {
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('围术期点评');
  const panel = activePanel();
  fireEvent.click(within(panel).getByTestId('ams-peri-server-check'));
  await waitFor(() => expect(m.checkRules).toHaveBeenCalled());
  expect(await screen.findByTestId('ams-peri-server-result')).toHaveTextContent('后端 CDS 预检');
});

it('专项点评：签名确认调 signReview', async () => {
  useAmsStore.setState({ reviews: [review()] });
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('专项点评');
  const btn = await screen.findByTestId('ams-sign-btn');
  fireEvent.click(btn);
  await waitFor(() => expect(m.signReview).toHaveBeenCalledWith('r1', undefined));
});

it('不合理用药看板：渲染不合理点评', async () => {
  useAmsStore.setState({ irrationalReviews: [review()] });
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('不合理用药看板');
  expect(await screen.findByText('超剂量')).toBeTruthy();
});

it('质控指标：加载 + 分子分母表头', async () => {
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  await switchTab('质控指标');
  const panel = activePanel();
  fireEvent.click(within(panel).getByTestId('ams-metrics-load'));
  await waitFor(() => expect(m.getAmsMetrics).toHaveBeenCalled());
  expect(screen.getByRole('columnheader', { name: '分子' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: '分母' })).toBeTruthy();
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
  render(<AmsPage />);
  expect(await screen.findByTestId('ams-offline-alert')).toBeTruthy();
  expect(screen.getByTestId('ams-health-tag')).toHaveTextContent('不可用');
  expect(screen.queryByTestId('ams-grant-submit')).toBeNull();
});

it('写失败：错误 Alert 展示且不吞', async () => {
  m.grantPrescriber.mockRejectedValue(new Error('越权 403'));
  render(<AmsPage />);
  await screen.findByTestId('ams-health-tag');
  const panel = activePanel();
  fireEvent.change(within(panel).getByTestId('ams-grant-prescriber'), { target: { value: 'u-x' } });
  fireEvent.click(within(panel).getByTestId('ams-grant-submit'));
  expect(await screen.findByTestId('ams-error-alert')).toHaveTextContent('越权 403');
});
