/**
 * 健澜科技 jlmedaios - RIS/PACS 检查全流程工作站（M11-B）
 *
 * 检查申请 / 排班预约 / 检查执行 / 报告书写与流转 / 报告查询。
 * 真实 BFF + 真实 PG。健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 * 写按钮按权限码（ris:*）做入口级隐藏；路由级仍由 RequirePermission 二次拦截。
 * AI 辅助结果仅展示，供医师采纳，不自动写入 findings/impression。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Input,
  Layout,
  Radio,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useRisStore } from '@/store/risStore';
import { useAuthStore } from '@/store/authStore';
import type {
  ImagingAppointmentStatus,
  ImagingRequestStatus,
  ImagingReportStatus,
  Modality,
  Urgency,
} from '@/types/ris';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '检查管理', 'jlmedaios'];

const REQUEST_STATUS_COLOR: Record<ImagingRequestStatus, string> = {
  requested: 'default',
  scheduled: 'blue',
  arrived: 'cyan',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'red',
};
const REQUEST_STATUS_LABEL: Record<ImagingRequestStatus, string> = {
  requested: '已申请',
  scheduled: '已预约',
  arrived: '已到检',
  in_progress: '检查中',
  completed: '已完成',
  cancelled: '已取消',
};
const APPT_STATUS_COLOR: Record<ImagingAppointmentStatus, string> = {
  booked: 'default',
  arrived: 'blue',
  done: 'green',
  cancelled: 'red',
  no_show: 'orange',
};
const APPT_STATUS_LABEL: Record<ImagingAppointmentStatus, string> = {
  booked: '已预约',
  arrived: '已到检',
  done: '已完成',
  cancelled: '已取消',
  no_show: '未到访',
};
const REPORT_STATUS_COLOR: Record<ImagingReportStatus, string> = {
  draft: 'default',
  reviewing: 'gold',
  approved: 'blue',
  published: 'green',
  returned: 'red',
};
const REPORT_STATUS_LABEL: Record<ImagingReportStatus, string> = {
  draft: '草稿',
  reviewing: '审核中',
  approved: '已审核',
  published: '已发布',
  returned: '已退回',
};
const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: 'routine', label: '常规' },
  { value: 'urgent', label: '加急' },
  { value: 'stat', label: '紧急' },
];

function fmtTime(v: string | null): string {
  return v ? dayjs(v).format('MM-DD HH:mm') : '-';
}

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示；
 *  此处吞掉 store 的 rethrow，避免未处理的 Promise rejection（控制台/测试噪音）。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Tab 1：检查申请
// ---------------------------------------------------------------------------
function RequestsTab() {
  const {
    exams,
    requests,
    requestDetail,
    createRequest,
    loadRequestDetail,
    cancelRequest,
  } = useRisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [visitId, setVisitId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('routine');
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [examIds, setExamIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState('');

  const onCreate = () => {
    run(
      createRequest({
        visitId,
        patientId,
        urgency,
        diagnosis: diagnosis || undefined,
        chiefComplaint: chiefComplaint || undefined,
        examIds,
      }),
    );
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="新建检查申请">
        <Space wrap align="start">
          <Input
            placeholder="就诊/住院 visitId"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            style={{ width: 220 }}
          />
          <Input
            placeholder="患者 patientId"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{ width: 220 }}
          />
          <Radio.Group
            options={URGENCY_OPTIONS}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Urgency)}
            optionType="button"
          />
          <Input
            placeholder="临床诊断"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="主诉"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            style={{ width: 160 }}
          />
        </Space>
        <div className="mt-3">
          <Typography.Text type="secondary">选择检查项目：</Typography.Text>
          <div className="mt-1">
            {exams.map((ex) => (
              <Checkbox
                key={ex.id}
                checked={examIds.includes(ex.id)}
                onChange={(e) =>
                  setExamIds((prev) =>
                    e.target.checked ? [...prev, ex.id] : prev.filter((x) => x !== ex.id),
                  )
                }
              >
                {ex.examCode} {ex.name}
              </Checkbox>
            ))}
          </div>
        </div>
        <div className="mt-2">
          {hasPerm('ris:request') && (
            <Button type="primary" onClick={onCreate}>
              新建申请
            </Button>
          )}
        </div>
      </Card>

      <Card size="small" title="申请列表">
        <Table
          size="small"
          rowKey="id"
          dataSource={requests}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '申请单号', dataIndex: 'requestNo' },
            { title: '患者', dataIndex: 'patientId' },
            { title: '就诊', dataIndex: 'visitId' },
            {
              title: '紧急度',
              dataIndex: 'urgency',
              render: (u: Urgency) =>
                URGENCY_OPTIONS.find((o) => o.value === u)?.label ?? u,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: ImagingRequestStatus) => (
                <Tag color={REQUEST_STATUS_COLOR[s]}>{REQUEST_STATUS_LABEL[s]}</Tag>
              ),
            },
            { title: '创建时间', dataIndex: 'createdAt', render: fmtTime },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('ris:request') && row.status !== 'cancelled' && (
                    <Button
                      size="small"
                      danger
                      onClick={() => run(cancelRequest(row.id, '临床医生取消'))}
                    >
                      取消
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="申请详情">
        <Space>
          <Input
            placeholder="输入检查申请 UUID"
            value={detailId}
            onChange={(e) => setDetailId(e.target.value)}
            style={{ width: 320 }}
          />
          <Button onClick={() => void loadRequestDetail(detailId)}>加载申请详情</Button>
        </Space>
        {requestDetail && (
          <Descriptions size="small" column={2} bordered className="mt-3">
            <Descriptions.Item label="申请单号">{requestDetail.requestNo}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={REQUEST_STATUS_COLOR[requestDetail.status]}>
                {REQUEST_STATUS_LABEL[requestDetail.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="项目数">
              {requestDetail.items?.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="预约数">
              {requestDetail.appointments?.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="执行数">
              {requestDetail.studies?.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="报告数">
              {requestDetail.reports?.length ?? 0}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// Tab 2：排班预约
// ---------------------------------------------------------------------------
function SchedulingTab() {
  const { devices, slots, appointments, loadSlots, createAppointment, checkinAppointment, cancelAppointment } =
    useRisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [deviceId, setDeviceId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [requestId, setRequestId] = useState('');
  const [examId, setExamId] = useState('');

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="设备时段排班">
        <Space wrap>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={{ width: 220 }}
            data-testid="ris-sched-device"
          >
            <option value="">选择设备</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deviceCode} {d.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="日期（YYYY-MM-DD）"
            value={slotDate}
            onChange={(e) => setSlotDate(e.target.value)}
            style={{ width: 180 }}
          />
          <Button onClick={() => void loadSlots(deviceId || undefined, slotDate || undefined)}>
            查询时段
          </Button>
        </Space>
        <Table
          className="mt-3"
          size="small"
          rowKey="id"
          dataSource={slots}
          pagination={false}
          columns={[
            { title: '开始', dataIndex: 'startTime' },
            { title: '结束', dataIndex: 'endTime' },
            { title: '容量', dataIndex: 'capacity' },
            { title: '已约', dataIndex: 'bookedCount' },
            {
              title: '剩余',
              key: 'remain',
              render: (_: unknown, row) => row.capacity - row.bookedCount,
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('ris:schedule') && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() =>
                        run(createAppointment({ requestId, examId, slotId: row.id }))
                      }
                    >
                      预约
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="待预约申请 / 项目">
        <Space wrap>
          <Input
            placeholder="申请 requestId"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            style={{ width: 240 }}
          />
          <Input
            placeholder="检查 examId"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            style={{ width: 240 }}
          />
        </Space>
      </Card>

      <Card size="small" title="预约列表（到检 / 取消）">
        <Table
          size="small"
          rowKey="id"
          dataSource={appointments}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '预约号', dataIndex: 'appointmentNo' },
            { title: '申请', dataIndex: 'requestId' },
            { title: '预约时间', dataIndex: 'scheduledStart', render: fmtTime },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: ImagingAppointmentStatus) => (
                <Tag color={APPT_STATUS_COLOR[s]}>{APPT_STATUS_LABEL[s]}</Tag>
              ),
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('ris:schedule') && row.status === 'booked' && (
                    <Button size="small" onClick={() => run(checkinAppointment(row.id))}>
                      到检
                    </Button>
                  )}
                  {hasPerm('ris:schedule') && row.status !== 'cancelled' && (
                    <Button size="small" danger onClick={() => run(cancelAppointment(row.id))}>
                      取消
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// Tab 3：检查执行
// ---------------------------------------------------------------------------
function PerformTab() {
  const { appointments, studies, performAppointment, addStudyImages } = useRisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [studyUid, setStudyUid] = useState('');
  const [imageRefsText, setImageRefsText] = useState('');

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="技师执行检查（到检后执行，生成 Study）">
        <Space wrap>
          <Input
            placeholder="DICOM Study UID"
            value={studyUid}
            onChange={(e) => setStudyUid(e.target.value)}
            style={{ width: 320 }}
          />
        </Space>
        <Table
          className="mt-3"
          size="small"
          rowKey="id"
          dataSource={appointments}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '预约号', dataIndex: 'appointmentNo' },
            { title: '预约时间', dataIndex: 'scheduledStart', render: fmtTime },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: ImagingAppointmentStatus) => (
                <Tag color={APPT_STATUS_COLOR[s]}>{APPT_STATUS_LABEL[s]}</Tag>
              ),
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('ris:perform') && row.status === 'arrived' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => run(performAppointment(row.id, studyUid))}
                    >
                      执行
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="登记图像引用（PACS DICOM 影像）">
        <Space wrap>
          <Input
            placeholder="图像引用（逗号分隔）"
            value={imageRefsText}
            onChange={(e) => setImageRefsText(e.target.value)}
            style={{ width: 360 }}
          />
        </Space>
        <Table
          className="mt-3"
          size="small"
          rowKey="id"
          dataSource={studies}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Study UID', dataIndex: 'studyUid' },
            { title: '模态', dataIndex: 'modality' },
            { title: '执行时间', dataIndex: 'performedAt', render: fmtTime },
            {
              title: '图像数',
              key: 'imgs',
              render: (_: unknown, row) => row.imageRefs?.length ?? 0,
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('ris:perform') && (
                    <Button
                      size="small"
                      onClick={() =>
                        run(
                          addStudyImages(
                            row.id,
                            imageRefsText
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          ),
                        )
                      }
                    >
                      登记图像
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// Tab 4：报告书写与流转
// ---------------------------------------------------------------------------
function ReportTab() {
  const {
    reportDetail,
    loadReportDetail,
    createStudyReport,
    saveReportDraft,
    aiAssist,
    submitReport,
    approveReport,
    returnReport,
    publishReport,
  } = useRisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [studyId, setStudyId] = useState('');
  const [reportId, setReportId] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [returnReason, setReturnReason] = useState('');

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="建草稿报告（按已执行 Study）">
        <Space wrap>
          <Input
            placeholder="检查 studyId"
            value={studyId}
            onChange={(e) => setStudyId(e.target.value)}
            style={{ width: 260 }}
          />
          {hasPerm('ris:report') && (
            <Button type="primary" onClick={() => run(createStudyReport(studyId))}>
              建草稿报告
            </Button>
          )}
        </Space>
      </Card>

      <Card size="small" title="报告加载">
        <Space>
          <Input
            placeholder="报告 reportId"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            style={{ width: 280 }}
          />
          <Button onClick={() => void loadReportDetail(reportId)}>加载报告详情</Button>
        </Space>
        {reportDetail && (
          <Descriptions size="small" column={2} bordered className="mt-3">
            <Descriptions.Item label="报告号">
              {reportDetail.reportNo ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={REPORT_STATUS_COLOR[reportDetail.status]}>
                {REPORT_STATUS_LABEL[reportDetail.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="检查项目">
              {reportDetail.examName ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="报告时间">{fmtTime(reportDetail.reportTime)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {reportDetail && (
        <Card size="small" title="报告书写（AI 辅助结果仅供医师参考采纳）">
          <Input.TextArea
            placeholder="影像所见 findings"
            rows={3}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
          />
          <Input.TextArea
            className="mt-2"
            placeholder="诊断意见 impression"
            rows={2}
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
          />
          <div className="mt-2">
            <Space wrap>
              {hasPerm('ris:report') && (
                <Button onClick={() => run(saveReportDraft(reportDetail.id, findings, impression))}>
                  保存草稿
                </Button>
              )}
              {hasPerm('ris:report') && (
                <Button onClick={() => run(aiAssist(reportDetail.id))}>AI 辅助</Button>
              )}
            </Space>
          </div>
          {reportDetail.aiFindings && (
            <Alert
              className="mt-3"
              type="info"
              showIcon
              message="AI 辅助结果（只读，供医师采纳，不自动写入报告）"
              description={reportDetail.aiFindings}
            />
          )}
        </Card>
      )}

      {reportDetail && (
        <Card size="small" title="报告流转（提交→审核→发布；退回可重提）">
          <Space wrap>
            {hasPerm('ris:report') && (
              <Button onClick={() => run(submitReport(reportDetail.id))}>提交审核</Button>
            )}
            {hasPerm('ris:review') && (
              <Button type="primary" onClick={() => run(approveReport(reportDetail.id))}>
                审核通过
              </Button>
            )}
            {hasPerm('ris:review') && (
              <>
                <Input
                  placeholder="退回原因"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ width: 200 }}
                />
                <Button danger onClick={() => run(returnReport(reportDetail.id, returnReason))}>
                  退回
                </Button>
              </>
            )}
            {hasPerm('ris:publish') && (
              <Button type="primary" onClick={() => run(publishReport(reportDetail.id))}>
                发布
              </Button>
            )}
          </Space>
        </Card>
      )}
    </Space>
  );
}

// ---------------------------------------------------------------------------
// Tab 5：报告查询
// ---------------------------------------------------------------------------
function ReportsQueryTab() {
  const { reports, loadReports } = useRisStore();
  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="报告查询">
        <Button onClick={() => void loadReports()}>刷新报告列表</Button>
        <Table
          className="mt-3"
          size="small"
          rowKey="id"
          dataSource={reports}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '报告号', dataIndex: 'reportNo', render: (v: string | null) => v ?? '-' },
            { title: '检查项目', dataIndex: 'examName', render: (v: string | null) => v ?? '-' },
            { title: '模态', dataIndex: 'modality', render: (v: Modality | null) => v ?? '-' },
            { title: '患者', dataIndex: 'patientId' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: ImagingReportStatus) => (
                <Tag color={REPORT_STATUS_COLOR[s]}>{REPORT_STATUS_LABEL[s]}</Tag>
              ),
            },
            { title: '报告时间', dataIndex: 'reportTime', render: fmtTime },
            { title: '发布时间', dataIndex: 'publishedAt', render: fmtTime },
          ]}
        />
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 页面
// ---------------------------------------------------------------------------
export default function RisPage() {
  const { dbUp, healthChecking, error, checkHealth, loadCatalog, loadRequests, loadAppointments, loadStudies, loadReports } =
    useRisStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadCatalog(), loadRequests(), loadAppointments(), loadStudies(), loadReports()]);
      }
      setReady(true);
    })();
  }, [checkHealth, loadCatalog, loadRequests, loadAppointments, loadStudies, loadReports]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) {
      await Promise.all([loadCatalog(), loadRequests(), loadAppointments(), loadStudies(), loadReports()]);
    }
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <ScanOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              检查管理（RIS/PACS）
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              申请 · 预约 · 执行 · 报告书写审核发布
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="ris-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          {error && (
            <Alert
              data-testid="ris-error-alert"
              className="mb-3"
              type="error"
              showIcon
              message={error}
            />
          )}
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="ris-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，检查管理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充检查/报告结果。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    重新探活
                  </button>
                }
              />
            ) : (
              <Tabs
                defaultActiveKey="requests"
                items={[
                  { key: 'requests', label: '检查申请', children: <RequestsTab /> },
                  { key: 'scheduling', label: '排班预约', children: <SchedulingTab /> },
                  { key: 'perform', label: '检查执行', children: <PerformTab /> },
                  { key: 'report', label: '报告书写与流转', children: <ReportTab /> },
                  { key: 'query', label: '报告查询', children: <ReportsQueryTab /> },
                ]}
              />
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
