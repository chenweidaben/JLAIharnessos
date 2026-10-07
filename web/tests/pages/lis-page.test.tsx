/**
 * 健澜科技 jlmedaios - LIS 检验全流程工作站页面测试（M11-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：健康标签、目录与各列表加载；
 *  - 检验申请：选择面板 + 新建申请（requestNo 前端生成 LR 前缀）；
 *  - 标本管理：采集 / 签收 / 拒收；
 *  - 结果录入与报告：录入结果、提交、审核（自审被拒提示）、退回、发布；
 *  - 报告查询：刷新列表；
 *  - 断库离线 Alert（不渲染业务内容）；
 *  - 无权限：写按钮按 lis:* 权限隐藏。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 权限另有 HTTP 端到端与路由取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import LisPage from '@/pages/lis';
import { useLisStore } from '@/store/lisStore';
import { useAuthStore } from '@/store/authStore';
import type {
  LabItem,
  LabPanel,
  LabReport,
  LabRequest,
  LabRequestDetail,
  LabResultRow,
  LabSpecimen,
} from '@/types/lis';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/lis', () => ({
  genRequestNo: () => 'LR' + Date.now().toString().slice(-8) + 'ab12',
  listPanels: vi.fn(),
  listItems: vi.fn(),
  createPanel: vi.fn(),
  createLabItem: vi.fn(),
  addPanelItem: vi.fn(),
  createRequest: vi.fn(),
  listRequests: vi.fn(),
  getRequestDetail: vi.fn(),
  cancelRequest: vi.fn(),
  generateSpecimens: vi.fn(),
  listSpecimens: vi.fn(),
  collectSpecimen: vi.fn(),
  receiveSpecimen: vi.fn(),
  rejectSpecimen: vi.fn(),
  createReport: vi.fn(),
  enterResults: vi.fn(),
  submitReport: vi.fn(),
  approveReport: vi.fn(),
  returnReport: vi.fn(),
  publishReport: vi.fn(),
  listReports: vi.fn(),
  getReportDetail: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as lisApi from '@/services/api/lis';

const healthMock = vi.mocked(getSystemHealth);
const api = lisApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

/* ------------------------------ 夹具 ------------------------------ */

function panelCBC(over: Partial<LabPanel> = {}): LabPanel {
  return {
    id: 'panel-cbc', code: 'CBC', name: '血常规', specimenType: 'EDTA抗凝血',
    execDepartment: '检验科', price: 20, isActive: true,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function itemHGB(over: Partial<LabItem> = {}): LabItem {
  return {
    id: 'item-hgb', code: 'HGB', name: '血红蛋白', specimenType: 'EDTA抗凝血',
    unit: 'g/L', refLow: 115, refHigh: 150, critLow: 50, critHigh: null,
    execDepartment: '检验科', price: 5, isActive: true,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function request(over: Partial<LabRequest> = {}): LabRequest {
  return {
    id: 'req1', requestNo: 'LR00000001', visitId: 'v1', patientId: 'p1',
    orderedBy: null, urgency: 'routine', diagnosis: null, note: null,
    status: 'requested', cancelledBy: null, cancelledAt: null, cancelReason: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function requestDetailOf(over: Partial<LabRequestDetail> = {}): LabRequestDetail {
  return {
    ...request(),
    items: [],
    specimens: [specimen()],
    reports: [report()],
    ...over,
  };
}
function specimen(over: Partial<LabSpecimen> = {}): LabSpecimen {
  return {
    id: 'sp1', specimenNo: 'S0001', requestId: 'req1', visitId: 'v1', patientId: 'p1',
    panelId: 'panel-cbc', specimenType: 'EDTA抗凝血', status: 'registered',
    collectedBy: null, collectedAt: null, collectionSite: null,
    receivedBy: null, receivedAt: null, rejectedBy: null, rejectedAt: null, rejectReason: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function resultRow(over: Partial<LabResultRow> = {}): LabResultRow {
  return {
    id: 'rr1', reportId: 'rep1', requestId: 'req1', specimenId: 'sp1',
    itemId: 'item-hgb', itemCode: 'HGB', itemName: '血红蛋白', unit: 'g/L',
    value: '130', numericValue: 130, abnormalFlag: 'N', isCritical: false,
    enteredBy: 'tech_lab', createdAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function report(over: Partial<LabReport> = {}): LabReport {
  return {
    id: 'rep1', reportNo: 'R0001', requestId: 'req1', visitId: 'v1', patientId: 'p1',
    specimenId: 'sp1', panelId: 'panel-cbc', panelName: '血常规', status: 'draft',
    enteredBy: 'tech_lab', reviewedBy: null, reviewedAt: null,
    publishedBy: null, publishedAt: null, returnedBy: null, returnedAt: null, returnReason: null,
    reportTime: null, results: [resultRow()],
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}

/* ------------------------------ 辅助 ------------------------------ */

function activePanel(): HTMLElement {
  return document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
}
async function switchTab(label: string) {
  fireEvent.click(await screen.findByText(label, { selector: '.ant-tabs-tab-btn' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['*'] });
  useLisStore.setState({
    panels: [], items: [], requests: [], specimens: [], reports: [],
    requestDetail: null, reportDetail: null, error: null, dbUp: false,
  });

  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  api.listPanels.mockResolvedValue([panelCBC()]);
  api.listItems.mockResolvedValue([itemHGB()]);
  api.listRequests.mockResolvedValue([request()]);
  api.listSpecimens.mockResolvedValue([specimen()]);
  api.listReports.mockResolvedValue([report()]);
  api.getRequestDetail.mockResolvedValue(requestDetailOf());
  api.getReportDetail.mockResolvedValue(report());
  api.createRequest.mockResolvedValue(request());
  api.cancelRequest.mockResolvedValue(request());
  api.generateSpecimens.mockResolvedValue([specimen()]);
  api.collectSpecimen.mockResolvedValue(specimen({ status: 'collected' }));
  api.receiveSpecimen.mockResolvedValue(specimen({ status: 'received' }));
  api.rejectSpecimen.mockResolvedValue(specimen({ status: 'rejected' }));
  api.createReport.mockResolvedValue(report());
  api.enterResults.mockResolvedValue(report());
  api.submitReport.mockResolvedValue(report({ status: 'reviewing' }));
  api.approveReport.mockResolvedValue(report({ status: 'approved' }));
  api.returnReport.mockResolvedValue(report({ status: 'returned' }));
  api.publishReport.mockResolvedValue(report({ status: 'published' }));
});

/* ------------------------------ 用例 ------------------------------ */

it('在线：健康标签 + 目录与各列表加载', async () => {
  render(<LisPage />);
  expect(await screen.findByTestId('lis-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(api.listPanels).toHaveBeenCalled());
  await waitFor(() => expect(api.listRequests).toHaveBeenCalled());
  await waitFor(() => expect(api.listSpecimens).toHaveBeenCalled());
  await waitFor(() => expect(api.listReports).toHaveBeenCalled());
});

it('检验申请：选择面板 + 新建申请（requestNo 前端生成）', async () => {
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  const panel = activePanel();

  fireEvent.change(within(panel).getByPlaceholderText('就诊/住院 visitId'), { target: { value: 'v1' } });
  fireEvent.change(within(panel).getByPlaceholderText('患者 patientId'), { target: { value: 'p1' } });
  // 勾选 CBC 面板
  fireEvent.click(within(panel).getByLabelText('CBC 血常规'));

  fireEvent.click(within(panel).getByRole('button', { name: '新建申请' }));
  await waitFor(() => expect(api.createRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      visitId: 'v1',
      patientId: 'p1',
      urgency: 'routine',
      items: [{ panelId: 'panel-cbc' }],
    }),
  ));
  const body = api.createRequest.mock.calls[0][0] as { requestNo: string };
  expect(body.requestNo).toMatch(/^LR/);

  // 加载申请详情
  fireEvent.change(within(panel).getByPlaceholderText('输入检验申请 UUID'), { target: { value: 'req1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载申请详情' }));
  await waitFor(() => expect(api.getRequestDetail).toHaveBeenCalledWith('req1'));
});

it('标本管理：采集 / 签收 / 拒收', async () => {
  // 该用例统一用 collected 状态，使采集/签收/拒收按钮均可见
  api.listSpecimens.mockResolvedValue([specimen({ status: 'collected' })]);
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  await switchTab('标本管理');
  const panel = activePanel();

  fireEvent.change(within(panel).getByPlaceholderText('采集部位（如 肘静脉）'), { target: { value: '肘静脉' } });
  fireEvent.click(within(panel).getByRole('button', { name: /采\s*集/ }));
  await waitFor(() => expect(api.collectSpecimen).toHaveBeenCalledWith('sp1', '肘静脉'));

  fireEvent.click(within(panel).getByRole('button', { name: /签\s*收/ }));
  await waitFor(() => expect(api.receiveSpecimen).toHaveBeenCalledWith('sp1'));

  fireEvent.change(within(panel).getByPlaceholderText('拒收原因'), { target: { value: '标本破损' } });
  fireEvent.click(within(panel).getByRole('button', { name: /拒\s*收/ }));
  await waitFor(() => expect(api.rejectSpecimen).toHaveBeenCalledWith('sp1', '标本破损'));
});

it('结果录入：建草稿报告 + 录入结果 + 提交审核', async () => {
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  await switchTab('结果录入与报告');
  const panel = activePanel();

  // 建草稿报告
  fireEvent.change(within(panel).getByPlaceholderText('申请 requestId'), { target: { value: 'req1' } });
  fireEvent.change(within(panel).getByTestId('lis-new-report-panel'), { target: { value: 'panel-cbc' } });
  fireEvent.click(within(panel).getByRole('button', { name: '建草稿报告' }));
  await waitFor(() => expect(api.createReport).toHaveBeenCalledWith('req1', 'panel-cbc'));

  // 加载报告
  fireEvent.change(within(panel).getByPlaceholderText('报告 reportId'), { target: { value: 'rep1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载报告详情' }));
  await waitFor(() => expect(api.getReportDetail).toHaveBeenCalledWith('rep1'));

  // 录入结果
  fireEvent.change(within(panel).getByPlaceholderText('项目 itemId（如 HGB）'), { target: { value: 'item-hgb' } });
  fireEvent.change(within(panel).getByPlaceholderText('结果值'), { target: { value: '130' } });
  fireEvent.click(within(panel).getByRole('button', { name: '录入结果' }));
  await waitFor(() => expect(api.enterResults).toHaveBeenCalledWith('rep1', { results: [{ itemId: 'item-hgb', value: '130' }] }));

  // 提交审核
  fireEvent.click(within(panel).getByRole('button', { name: '提交审核' }));
  await waitFor(() => expect(api.submitReport).toHaveBeenCalledWith('rep1'));
}, 30000);

it('报告流转：审核（自审被拒提示）+ 再审核 + 退回 + 发布', async () => {
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  await switchTab('结果录入与报告');
  const panel = activePanel();

  // 加载报告详情
  fireEvent.change(within(panel).getByPlaceholderText('报告 reportId'), { target: { value: 'rep1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载报告详情' }));
  await waitFor(() => expect(api.getReportDetail).toHaveBeenCalledWith('rep1'));

  // 自审被拒：审核人 == 录入人，后端拒绝
  api.approveReport.mockRejectedValue(new Error('录入人与审核人不能为同一人，须职责分离'));
  fireEvent.click(within(panel).getByRole('button', { name: '审核通过' }));
  expect(await screen.findByTestId('lis-error-alert')).toHaveTextContent('职责分离');

  // 恢复：换审核人后审核通过
  api.approveReport.mockResolvedValue(report({ status: 'approved' }));
  fireEvent.click(within(panel).getByRole('button', { name: '审核通过' }));
  await waitFor(() => expect(api.approveReport).toHaveBeenCalledWith('rep1'));

  // 退回
  fireEvent.change(within(panel).getByPlaceholderText('退回原因'), { target: { value: '数值异常需重测' } });
  fireEvent.click(within(panel).getByRole('button', { name: /退\s*回/ }));
  await waitFor(() => expect(api.returnReport).toHaveBeenCalledWith('rep1', '数值异常需重测'));

  // 发布
  fireEvent.click(within(panel).getByRole('button', { name: /发\s*布/ }));
  await waitFor(() => expect(api.publishReport).toHaveBeenCalledWith('rep1'));
}, 30000);

it('报告查询：刷新报告列表', async () => {
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  await switchTab('报告查询');
  const panel = activePanel();
  fireEvent.click(within(panel).getByRole('button', { name: '刷新报告列表' }));
  await waitFor(() => expect(api.listReports).toHaveBeenCalled());
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('数据库不可用'));
  render(<LisPage />);
  expect(await screen.findByTestId('lis-offline-alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '新建申请' })).toBeNull();
});

it('无权限：无 lis:request 时不渲染新建申请按钮', async () => {
  useAuthStore.setState({ permissions: ['lab:read'] });
  render(<LisPage />);
  await screen.findByTestId('lis-health-tag');
  // 检验申请 Tab 为默认激活页
  await waitFor(() => expect(api.listRequests).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: '新建申请' })).toBeNull();
});
