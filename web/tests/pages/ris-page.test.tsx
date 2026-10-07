/**
 * 健澜科技 jlmedaios - RIS/PACS 检查全流程工作站页面测试（M11-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：健康标签、目录与各列表加载；
 *  - 检查申请：勾选检查项目 + 新建申请（requestNo 前端生成 RQ 前缀）+ 加载详情；
 *  - 排班预约：查询时段、预约（appointmentNo RA 前缀）、到检；
 *  - 检查执行：到检后执行生成 study、登记图像引用；
 *  - 报告书写与流转：建草稿、保存草稿、AI 辅助（只读展示）、提交；
 *  - 报告流转：自审 409 提示、再审核、退回、发布；
 *  - 报告查询：刷新列表；
 *  - 断库离线 Alert（不渲染业务内容）；
 *  - 无权限：写按钮按 ris:* 权限隐藏。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 权限另有 HTTP 端到端与路由取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import RisPage from '@/pages/ris';
import { useRisStore } from '@/store/risStore';
import { useAuthStore } from '@/store/authStore';
import type {
  ImagingAppointment,
  ImagingDevice,
  ImagingDeviceSlot,
  ImagingExam,
  ImagingReport,
  ImagingRequest,
  ImagingRequestDetail,
  ImagingStudy,
} from '@/types/ris';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/ris', () => ({
  genRequestNo: () => 'RQ' + Date.now().toString().slice(-8) + 'ab12',
  genAppointmentNo: () => 'RA' + Date.now().toString().slice(-8) + 'cd34',
  genReportNo: () => 'RR' + Date.now().toString().slice(-8) + 'ef56',
  listExams: vi.fn(),
  listDevices: vi.fn(),
  createExam: vi.fn(),
  createDevice: vi.fn(),
  createSlot: vi.fn(),
  listSlots: vi.fn(),
  createImagingRequest: vi.fn(),
  listImagingRequests: vi.fn(),
  getImagingRequestDetail: vi.fn(),
  cancelImagingRequest: vi.fn(),
  createAppointment: vi.fn(),
  listAppointments: vi.fn(),
  checkinAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
  performAppointment: vi.fn(),
  listStudies: vi.fn(),
  addStudyImages: vi.fn(),
  createStudyReport: vi.fn(),
  listReports: vi.fn(),
  saveReportDraft: vi.fn(),
  aiAssistReport: vi.fn(),
  submitReport: vi.fn(),
  approveReport: vi.fn(),
  returnReport: vi.fn(),
  publishReport: vi.fn(),
  getReportDetail: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as risApi from '@/services/api/ris';

const healthMock = vi.mocked(getSystemHealth);
const api = risApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

/* ------------------------------ 夹具 ------------------------------ */

function exam(over: Partial<ImagingExam> = {}): ImagingExam {
  return {
    id: 'exam-ct-head', examCode: 'CT_HEAD', name: '头颅CT平扫', modality: 'CT',
    bodyPart: '头颅', execDepartment: '放射科', defaultDeviceId: null, price: 120,
    needsScheduling: true, durationMinutes: 10, isActive: true,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function device(over: Partial<ImagingDevice> = {}): ImagingDevice {
  return {
    id: 'dev-ct1', deviceCode: 'CT1', name: '1号CT', modality: 'CT', room: '1号CT室',
    isActive: true,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function slot(over: Partial<ImagingDeviceSlot> = {}): ImagingDeviceSlot {
  return {
    id: 'slot1', deviceId: 'dev-ct1', slotDate: '2026-10-09', startTime: '09:00',
    endTime: '09:30', capacity: 2, bookedCount: 0, isActive: true,
    createdAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function request(over: Partial<ImagingRequest> = {}): ImagingRequest {
  return {
    id: 'req1', requestNo: 'RQ00000001', visitId: 'v1', patientId: 'p1',
    orderedBy: null, urgency: 'routine', diagnosis: null, chiefComplaint: null,
    status: 'requested', cancelledBy: null, cancelledAt: null, cancelReason: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function study(over: Partial<ImagingStudy> = {}): ImagingStudy {
  return {
    id: 'study1', studyUid: '2.25.1234', appointmentId: 'apt1', requestId: 'req1',
    examId: 'exam-ct-head', deviceId: 'dev-ct1', modality: 'CT', status: 'performed',
    performedBy: 'rad_tech', performedAt: '2026-10-09T09:20:00.000Z', imageRefs: [],
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function appt(over: Partial<ImagingAppointment> = {}): ImagingAppointment {
  return {
    id: 'apt1', appointmentNo: 'RA00000001', requestId: 'req1', examId: 'exam-ct-head',
    slotId: 'slot1', deviceId: 'dev-ct1', scheduledStart: '2026-10-09T09:00:00.000Z',
    status: 'booked', checkedInAt: null, createdBy: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function report(over: Partial<ImagingReport> = {}): ImagingReport {
  return {
    id: 'rep1', reportNo: 'RR00000001', visitId: 'v1', patientId: 'p1',
    studyUid: '2.25.1234', modality: 'CT', examName: '头颅CT平扫', bodyPart: '头颅',
    findings: null, impression: null, aiFindings: null, isCritical: false,
    reportTime: null, imageRefs: [], status: 'draft',
    requestId: 'req1', appointmentId: 'apt1', studyId: 'study1', examId: 'exam-ct-head',
    writtenBy: 'rad_tech', submittedAt: null, reviewedBy: null, reviewedAt: null,
    publishedBy: null, publishedAt: null, returnedBy: null, returnedAt: null, returnReason: null,
    createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
    ...over,
  };
}
function requestDetailOf(over: Partial<ImagingRequestDetail> = {}): ImagingRequestDetail {
  return {
    ...request(),
    items: [{ id: 'ri1', requestId: 'req1', examId: 'exam-ct-head', createdAt: '2026-10-01T12:00:00.000Z' }],
    appointments: [appt()],
    studies: [study()],
    reports: [report()],
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
  useRisStore.setState({
    exams: [], devices: [], slots: [], requests: [], requestDetail: null,
    appointments: [], studies: [], reports: [], reportDetail: null,
    error: null, dbUp: false,
  });

  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  api.listExams.mockResolvedValue([exam()]);
  api.listDevices.mockResolvedValue([device()]);
  api.listSlots.mockResolvedValue([slot()]);
  api.listImagingRequests.mockResolvedValue([request()]);
  api.getImagingRequestDetail.mockResolvedValue(requestDetailOf());
  api.cancelImagingRequest.mockResolvedValue(request());
  api.listAppointments.mockResolvedValue([appt()]);
  api.createAppointment.mockResolvedValue(appt());
  api.checkinAppointment.mockResolvedValue(appt({ status: 'arrived' }));
  api.cancelAppointment.mockResolvedValue(appt({ status: 'cancelled' }));
  api.performAppointment.mockResolvedValue(study());
  api.listStudies.mockResolvedValue([study()]);
  api.addStudyImages.mockResolvedValue(study({ imageRefs: ['img1'] }));
  api.createStudyReport.mockResolvedValue(report());
  api.listReports.mockResolvedValue([report()]);
  api.getReportDetail.mockResolvedValue(report());
  api.saveReportDraft.mockResolvedValue(report());
  api.aiAssistReport.mockResolvedValue(report({ aiFindings: '右肺微小结节，建议随访' }));
  api.submitReport.mockResolvedValue(report({ status: 'reviewing' }));
  api.approveReport.mockResolvedValue(report({ status: 'approved' }));
  api.returnReport.mockResolvedValue(report({ status: 'returned' }));
  api.publishReport.mockResolvedValue(report({ status: 'published' }));
});

/* ------------------------------ 用例 ------------------------------ */

it('在线：健康标签 + 目录与各列表加载', async () => {
  render(<RisPage />);
  expect(await screen.findByTestId('ris-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  await waitFor(() => expect(api.listExams).toHaveBeenCalled());
  await waitFor(() => expect(api.listImagingRequests).toHaveBeenCalled());
  await waitFor(() => expect(api.listAppointments).toHaveBeenCalled());
  await waitFor(() => expect(api.listStudies).toHaveBeenCalled());
  await waitFor(() => expect(api.listReports).toHaveBeenCalled());
});

it('检查申请：勾选检查项目 + 新建申请（requestNo 前端生成 RQ 前缀）+ 加载详情', async () => {
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  const panel = activePanel();

  fireEvent.change(within(panel).getByPlaceholderText('就诊/住院 visitId'), { target: { value: 'v1' } });
  fireEvent.change(within(panel).getByPlaceholderText('患者 patientId'), { target: { value: 'p1' } });
  fireEvent.click(within(panel).getByLabelText('CT_HEAD 头颅CT平扫'));

  fireEvent.click(within(panel).getByRole('button', { name: '新建申请' }));
  await waitFor(() => expect(api.createImagingRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      visitId: 'v1',
      patientId: 'p1',
      urgency: 'routine',
      items: [{ examId: 'exam-ct-head' }],
    }),
  ));
  const body = api.createImagingRequest.mock.calls[0][0] as { requestNo: string };
  expect(body.requestNo).toMatch(/^RQ/);

  // 加载申请详情
  fireEvent.change(within(panel).getByPlaceholderText('输入检查申请 UUID'), { target: { value: 'req1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载申请详情' }));
  await waitFor(() => expect(api.getImagingRequestDetail).toHaveBeenCalledWith('req1'));
});

it('排班预约：查询时段 + 预约（appointmentNo RA 前缀）+ 到检', async () => {
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  await switchTab('排班预约');
  const panel = activePanel();

  // 选设备 + 日期，查询时段
  fireEvent.change(within(panel).getByTestId('ris-sched-device'), { target: { value: 'dev-ct1' } });
  fireEvent.change(within(panel).getByPlaceholderText('日期（YYYY-MM-DD）'), { target: { value: '2026-10-09' } });
  fireEvent.click(within(panel).getByRole('button', { name: '查询时段' }));
  await waitFor(() => expect(api.listSlots).toHaveBeenCalledWith(
    expect.objectContaining({ deviceId: 'dev-ct1', date: '2026-10-09' }),
  ));

  // 填申请 / 项目后预约该时段
  fireEvent.change(within(panel).getByPlaceholderText('申请 requestId'), { target: { value: 'req1' } });
  fireEvent.change(within(panel).getByPlaceholderText('检查 examId'), { target: { value: 'exam-ct-head' } });
  fireEvent.click(within(panel).getByRole('button', { name: /预\s*约/ }));
  await waitFor(() => expect(api.createAppointment).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: 'req1', examId: 'exam-ct-head', slotId: 'slot1' }),
  ));
  const body = api.createAppointment.mock.calls[0][0] as { appointmentNo: string };
  expect(body.appointmentNo).toMatch(/^RA/);

  // 到检登记
  fireEvent.click(within(panel).getByRole('button', { name: /到\s*检/ }));
  await waitFor(() => expect(api.checkinAppointment).toHaveBeenCalledWith('apt1'));
}, 30000);

it('检查执行：到检后执行生成 study + 登记图像引用', async () => {
  // arrived 状态使“执行”按钮可见
  api.listAppointments.mockResolvedValue([appt({ status: 'arrived' })]);
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  await switchTab('检查执行');
  const panel = activePanel();

  fireEvent.change(within(panel).getByPlaceholderText('DICOM Study UID'), { target: { value: '2.25.9999' } });
  fireEvent.click(within(panel).getByRole('button', { name: /执\s*行/ }));
  await waitFor(() => expect(api.performAppointment).toHaveBeenCalledWith('apt1', '2.25.9999'));

  fireEvent.change(within(panel).getByPlaceholderText('图像引用（逗号分隔）'), { target: { value: 'img1,img2' } });
  fireEvent.click(within(panel).getByRole('button', { name: '登记图像' }));
  await waitFor(() => expect(api.addStudyImages).toHaveBeenCalledWith(
    'study1',
    expect.objectContaining({ imageRefs: ['img1', 'img2'] }),
  ));
}, 30000);

it('报告书写：建草稿 + 保存草稿 + AI 辅助（只读展示）+ 提交', async () => {
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  await switchTab('报告书写与流转');
  const panel = activePanel();

  // 建草稿报告（reportNo 前端生成 RR 前缀）
  fireEvent.change(within(panel).getByPlaceholderText('检查 studyId'), { target: { value: 'study1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '建草稿报告' }));
  await waitFor(() => expect(api.createStudyReport).toHaveBeenCalledWith('study1', expect.stringMatching(/^RR/)));

  // 加载报告
  fireEvent.change(within(panel).getByPlaceholderText('报告 reportId'), { target: { value: 'rep1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载报告详情' }));
  await waitFor(() => expect(api.getReportDetail).toHaveBeenCalledWith('rep1'));

  // 书写并保存草稿
  fireEvent.change(within(panel).getByPlaceholderText('影像所见 findings'), { target: { value: '头颅CT平扫未见明显异常' } });
  fireEvent.change(within(panel).getByPlaceholderText('诊断意见 impression'), { target: { value: '未见异常' } });
  fireEvent.click(within(panel).getByRole('button', { name: '保存草稿' }));
  await waitFor(() =>
    expect(api.saveReportDraft).toHaveBeenCalledWith(
      'rep1',
      expect.objectContaining({ findings: '头颅CT平扫未见明显异常', impression: '未见异常' }),
    ),
  );

  // AI 辅助：结果只读展示，供医师采纳
  fireEvent.click(within(panel).getByRole('button', { name: /AI\s*辅助/ }));
  await waitFor(() => expect(api.aiAssistReport).toHaveBeenCalledWith('rep1'));
  expect(await screen.findByText('右肺微小结节，建议随访')).toBeTruthy();

  // 提交审核
  fireEvent.click(within(panel).getByRole('button', { name: '提交审核' }));
  await waitFor(() => expect(api.submitReport).toHaveBeenCalledWith('rep1'));
}, 30000);

it('报告流转：自审 409 提示 + 再审核 + 退回 + 发布', async () => {
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  await switchTab('报告书写与流转');
  const panel = activePanel();

  // 加载报告详情
  fireEvent.change(within(panel).getByPlaceholderText('报告 reportId'), { target: { value: 'rep1' } });
  fireEvent.click(within(panel).getByRole('button', { name: '加载报告详情' }));
  await waitFor(() => expect(api.getReportDetail).toHaveBeenCalledWith('rep1'));

  // 自审被拒：书写人 == 审核人，后端 409
  api.approveReport.mockRejectedValue(new Error('书写人与审核人不能为同一人，须职责分离'));
  fireEvent.click(within(panel).getByRole('button', { name: '审核通过' }));
  expect(await screen.findByTestId('ris-error-alert')).toHaveTextContent('职责分离');

  // 恢复：换审核人后审核通过
  api.approveReport.mockResolvedValue(report({ status: 'approved' }));
  fireEvent.click(within(panel).getByRole('button', { name: '审核通过' }));
  await waitFor(() => expect(api.approveReport).toHaveBeenCalledWith('rep1'));

  // 退回
  fireEvent.change(within(panel).getByPlaceholderText('退回原因'), { target: { value: '图像模糊需重拍' } });
  fireEvent.click(within(panel).getByRole('button', { name: /退\s*回/ }));
  await waitFor(() => expect(api.returnReport).toHaveBeenCalledWith('rep1', '图像模糊需重拍'));

  // 发布
  fireEvent.click(within(panel).getByRole('button', { name: /发\s*布/ }));
  await waitFor(() => expect(api.publishReport).toHaveBeenCalledWith('rep1'));
}, 30000);

it('报告查询：刷新报告列表', async () => {
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  await switchTab('报告查询');
  const panel = activePanel();
  fireEvent.click(within(panel).getByRole('button', { name: '刷新报告列表' }));
  await waitFor(() => expect(api.listReports).toHaveBeenCalled());
});

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('数据库不可用'));
  render(<RisPage />);
  expect(await screen.findByTestId('ris-offline-alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '新建申请' })).toBeNull();
});

it('无权限：无 ris:request 时不渲染新建申请按钮', async () => {
  useAuthStore.setState({ permissions: ['imaging:read'] });
  render(<RisPage />);
  await screen.findByTestId('ris-health-tag');
  // 检查申请 Tab 为默认激活页
  await waitFor(() => expect(api.listImagingRequests).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: '新建申请' })).toBeNull();
});
