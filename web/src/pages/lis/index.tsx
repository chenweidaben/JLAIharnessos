/**
 * 健澜科技 jlmedaios - LIS 检验全流程工作站（M11-A）
 *
 * 检验申请 / 标本管理 / 结果录入与报告 / 报告查询。
 * 真实 BFF + 真实 PG。健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 * 写按钮按权限码（lis:*）做入口级隐藏；路由级仍由 RequirePermission 二次拦截。
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
import { ExperimentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useLisStore } from '@/store/lisStore';
import { useAuthStore } from '@/store/authStore';
import type {
  LabRequestStatus,
  ReportStatus,
  SpecimenStatus,
  Urgency,
} from '@/types/lis';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '检验管理', 'jlmedaios'];

const REQUEST_STATUS_COLOR: Record<LabRequestStatus, string> = {
  requested: 'default',
  accepted: 'blue',
  specimen_collected: 'cyan',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'red',
};
const REQUEST_STATUS_LABEL: Record<LabRequestStatus, string> = {
  requested: '已申请',
  accepted: '已受理',
  specimen_collected: '已采集',
  in_progress: '检验中',
  completed: '已完成',
  cancelled: '已取消',
};
const SPECIMEN_STATUS_COLOR: Record<SpecimenStatus, string> = {
  registered: 'default',
  collected: 'blue',
  received: 'cyan',
  rejected: 'red',
  tested: 'green',
};
const SPECIMEN_STATUS_LABEL: Record<SpecimenStatus, string> = {
  registered: '已登记',
  collected: '已采集',
  received: '已签收',
  rejected: '已拒收',
  tested: '已检测',
};
const REPORT_STATUS_COLOR: Record<ReportStatus, string> = {
  draft: 'default',
  reviewing: 'gold',
  approved: 'blue',
  published: 'green',
  returned: 'red',
};
const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
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
// Tab 1：检验申请
// ---------------------------------------------------------------------------
function RequestsTab() {
  const {
    panels,
    items,
    requests,
    requestDetail,
    createRequest,
    loadRequestDetail,
    cancelRequest,
    generateSpecimens,
  } = useLisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [visitId, setVisitId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('routine');
  const [diagnosis, setDiagnosis] = useState('');
  const [note, setNote] = useState('');
  const [panelIds, setPanelIds] = useState<string[]>([]);
  const [itemIds, setItemIds] = useState<string[]>([]);

  const [detailId, setDetailId] = useState('');

  const onCreate = () => {
    run(
      createRequest({
      visitId,
      patientId,
      urgency,
      diagnosis: diagnosis || undefined,
      note: note || undefined,
      items: [
        ...panelIds.map((panelId) => ({ panelId })),
        ...itemIds.map((itemId) => ({ itemId })),
      ],
    }),
    );
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="新建检验申请">
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
          <Input.TextArea
            placeholder="备注"
            rows={1}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Space>
        <div className="mt-3">
          <Typography.Text type="secondary">选择检验面板：</Typography.Text>
          <div className="mt-1">
            {panels.map((p) => (
              <Checkbox
                key={p.id}
                checked={panelIds.includes(p.id)}
                onChange={(e) =>
                  setPanelIds((prev) =>
                    e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                  )
                }
              >
                {p.code} {p.name}
              </Checkbox>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <Typography.Text type="secondary">单项加测：</Typography.Text>
          <div className="mt-1">
            {items.map((it) => (
              <Checkbox
                key={it.id}
                checked={itemIds.includes(it.id)}
                onChange={(e) =>
                  setItemIds((prev) =>
                    e.target.checked ? [...prev, it.id] : prev.filter((x) => x !== it.id),
                  )
                }
              >
                {it.code} {it.name}
              </Checkbox>
            ))}
          </div>
        </div>
        <div className="mt-2">
          {hasPerm('lis:request') && (
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
              render: (s: LabRequestStatus) => (
                <Tag color={REQUEST_STATUS_COLOR[s]}>{REQUEST_STATUS_LABEL[s]}</Tag>
              ),
            },
            { title: '创建时间', dataIndex: 'createdAt', render: fmtTime },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('lis:receive') && (
                    <Button size="small" onClick={() => run(generateSpecimens(row.id))}>
                      生成标本
                    </Button>
                  )}
                  {hasPerm('lis:request') && row.status !== 'cancelled' && (
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
            placeholder="输入检验申请 UUID"
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
            <Descriptions.Item label="标本数">
              {requestDetail.specimens?.length ?? 0}
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
// Tab 2：标本管理
// ---------------------------------------------------------------------------
function SpecimensTab() {
  const { specimens, collectSpecimen, receiveSpecimen, rejectSpecimen } = useLisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const [site, setSite] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="标本处理（采集 / 签收 / 拒收）">
        <Space wrap>
          <Input
            placeholder="采集部位（如 肘静脉）"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="拒收原因"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>
        <Table
          className="mt-3"
          size="small"
          rowKey="id"
          dataSource={specimens}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '条码', dataIndex: 'specimenNo' },
            { title: '标本类型', dataIndex: 'specimenType' },
            { title: '采集部位', dataIndex: 'collectionSite', render: (v: string | null) => v ?? '-' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: SpecimenStatus) => (
                <Tag color={SPECIMEN_STATUS_COLOR[s]}>{SPECIMEN_STATUS_LABEL[s]}</Tag>
              ),
            },
            { title: '采集时间', dataIndex: 'collectedAt', render: fmtTime },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row) => (
                <Space>
                  {hasPerm('lis:collect') && (row.status === 'registered' || row.status === 'collected') && (
                    <Button size="small" onClick={() => run(collectSpecimen(row.id, site))}>
                      采集
                    </Button>
                  )}
                  {hasPerm('lis:receive') && row.status === 'collected' && (
                    <Button size="small" onClick={() => run(receiveSpecimen(row.id))}>
                      签收
                    </Button>
                  )}
                  {hasPerm('lis:receive') && (row.status === 'registered' || row.status === 'collected') && (
                    <Button size="small" danger onClick={() => run(rejectSpecimen(row.id, rejectReason))}>
                      拒收
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
// Tab 3：结果录入与报告
// ---------------------------------------------------------------------------
function ResultsTab() {
  const {
    panels,
    reportDetail,
    loadReportDetail,
    createReport,
    enterResults,
    submitReport,
    approveReport,
    returnReport,
    publishReport,
  } = useLisStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);

  const [reportId, setReportId] = useState('');
  const [newRequestId, setNewRequestId] = useState('');
  const [newPanelId, setNewPanelId] = useState('');
  const [itemId, setItemId] = useState('');
  const [value, setValue] = useState('');
  const [returnReason, setReturnReason] = useState('');

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="建草稿报告（按申请 + 面板）">
        <Space wrap>
          <Input
            placeholder="申请 requestId"
            value={newRequestId}
            onChange={(e) => setNewRequestId(e.target.value)}
            style={{ width: 240 }}
          />
          <select
            value={newPanelId}
            onChange={(e) => setNewPanelId(e.target.value)}
            style={{ width: 200 }}
            data-testid="lis-new-report-panel"
          >
            <option value="">选择面板</option>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
          {hasPerm('lis:enter') && (
            <Button type="primary" onClick={() => run(createReport(newRequestId, newPanelId))}>
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
            <Descriptions.Item label="报告号">{reportDetail.reportNo}</Descriptions.Item>
            <Descriptions.Item label="面板">{reportDetail.panelName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={REPORT_STATUS_COLOR[reportDetail.status]}>
                {REPORT_STATUS_LABEL[reportDetail.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="报告时间">{fmtTime(reportDetail.reportTime)}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {reportDetail && (
        <Card size="small" title="结果录入">
          <Space wrap>
            <Input
              placeholder="项目 itemId（如 HGB）"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              style={{ width: 200 }}
            />
            <Input
              placeholder="结果值"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: 140 }}
            />
            {hasPerm('lis:enter') && (
              <Button
                type="primary"
                onClick={() => run(enterResults(reportDetail.id, [{ itemId, value }]))}
              >
                录入结果
              </Button>
            )}
          </Space>
          <Table
            className="mt-3"
            size="small"
            rowKey="id"
            dataSource={reportDetail.results ?? []}
            pagination={false}
            columns={[
              { title: '项目', dataIndex: 'itemCode' },
              { title: '名称', dataIndex: 'itemName' },
              { title: '结果', dataIndex: 'value' },
              { title: '单位', dataIndex: 'unit', render: (v: string | null) => v ?? '-' },
              {
                title: '标志',
                dataIndex: 'abnormalFlag',
                render: (f: string, row) =>
                  row.isCritical ? <Tag color="red">{f} 危急</Tag> : <Tag>{f}</Tag>,
              },
            ]}
          />
        </Card>
      )}

      {reportDetail && (
        <Card size="small" title="报告流转（提交→审核→发布；退回可重提）">
          <Space wrap>
            {hasPerm('lis:enter') && (
              <Button onClick={() => run(submitReport(reportDetail.id))}>提交审核</Button>
            )}
            {hasPerm('lis:review') && (
              <Button type="primary" onClick={() => run(approveReport(reportDetail.id))}>
                审核通过
              </Button>
            )}
            {hasPerm('lis:review') && (
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
            {hasPerm('lis:publish') && (
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
// Tab 4：报告查询
// ---------------------------------------------------------------------------
function ReportsTab() {
  const { reports, loadReports } = useLisStore();
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
            { title: '报告号', dataIndex: 'reportNo' },
            { title: '面板', dataIndex: 'panelName', render: (v: string | null) => v ?? '-' },
            { title: '患者', dataIndex: 'patientId' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: ReportStatus) => (
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
export default function LisPage() {
  const { dbUp, healthChecking, error, checkHealth, loadCatalog, loadRequests, loadSpecimens, loadReports } =
    useLisStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadCatalog(), loadRequests(), loadSpecimens(), loadReports()]);
      }
      setReady(true);
    })();
  }, [checkHealth, loadCatalog, loadRequests, loadSpecimens, loadReports]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) {
      await Promise.all([loadCatalog(), loadRequests(), loadSpecimens(), loadReports()]);
    }
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <ExperimentOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              检验管理（LIS）
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              申请 · 标本 · 结果录入 · 报告审核发布
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="lis-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          {error && (
            <Alert
              data-testid="lis-error-alert"
              className="mb-3"
              type="error"
              showIcon
              message={error}
            />
          )}
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="lis-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，检验管理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充检验结果。"
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
                  { key: 'requests', label: '检验申请', children: <RequestsTab /> },
                  { key: 'specimens', label: '标本管理', children: <SpecimensTab /> },
                  { key: 'results', label: '结果录入与报告', children: <ResultsTab /> },
                  { key: 'reports', label: '报告查询', children: <ReportsTab /> },
                ]}
              />
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
