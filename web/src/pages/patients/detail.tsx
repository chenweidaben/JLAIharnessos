/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者360视图：概览 / 就诊记录 / 检验检查 / 医嘱 / 病历文书 聚合
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Row,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import { PatientInfoCard, VitalSignsPanel, AlertBanner } from '@/components/medical';
import { ImagingAiReport } from '@/components/imagingAi';
import { LineChart } from '@/components/charts';
import { usePageTitle } from '@/hooks';
import { getPatientHistory } from '@/api/patient';
import { fetchAlerts } from '@/services/api/patient';
import { usePatientStore } from '@/store/patientStore';
import type { Alert } from '@/types/medical';
import type {
  DocType,
  Encounter,
  LabFlag,
  LabReport,
  MedicalDocument,
  OrderCategory,
  OrderRecord,
  OrderStatus,
  ImagingReport,
} from '@/types/patient';

const { Text, Paragraph } = Typography;

const fmt = (t?: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—');
const fmtShort = (t?: string) => (t ? dayjs(t).format('MM-DD HH:mm') : '—');

/* ----------------------------- 展示映射 ----------------------------- */
const ENCOUNTER_META: Record<Encounter['type'], { label: string; color: string }> = {
  inpatient: { label: '住院', color: 'blue' },
  outpatient: { label: '门诊', color: 'cyan' },
  emergency: { label: '急诊', color: 'red' },
};

const ORDER_CATEGORY: Record<OrderCategory, string> = {
  medication: '药物治疗',
  examination: '检查',
  lab: '检验',
  nursing: '护理',
  diet: '饮食',
  treatment: '处置/监测',
};

const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  active: { label: '执行中', color: 'green' },
  stopped: { label: '已停止', color: 'default' },
  completed: { label: '已完成', color: 'blue' },
  pending: { label: '待执行', color: 'orange' },
};

const DOC_TYPE: Record<DocType, string> = {
  admission: '入院记录',
  progress: '病程记录',
  round: '查房记录',
  discharge: '出院记录',
  consent: '知情同意',
  consultation: '会诊记录',
};

const DOC_STATUS = {
  draft: { label: '草稿', color: 'default' },
  signed: { label: '已签名', color: 'green' },
  audited: { label: '已质控', color: 'blue' },
} as const;

function LabValueTag({ flag, value, unit }: { flag: LabFlag; value: number | string; unit: string }) {
  if (flag === 'critical') {
    return (
      <span>
        <Text strong style={{ color: '#cf1322' }}>
          {value} {unit}
        </Text>{' '}
        <Tag color="red">危急值</Tag>
      </span>
    );
  }
  if (flag === 'high')
    return (
      <Text strong style={{ color: '#d46b08' }}>
        {value} {unit} ↑
      </Text>
    );
  if (flag === 'low')
    return (
      <Text strong style={{ color: '#096dd9' }}>
        {value} {unit} ↓
      </Text>
    );
  return (
    <span>
      {value} {unit}
    </span>
  );
}

/* ------------------------------- 页面 ------------------------------- */
export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageTitle('患者详情');

  const { patient360, setPatient360, currentPatient } = usePatientStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    getPatientHistory(id)
      .then((data) => {
        if (alive) setPatient360(data);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : '患者360 数据加载失败');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    fetchAlerts()
      .then((list) => {
        if (alive) setAlerts(list.filter((a) => a.patientId === id && !a.acknowledged));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id, setPatient360]);

  const view = useMemo(() => patient360, [patient360]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载患者360…" />
      </div>
    );
  }

  if (error || !view || !currentPatient) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Empty description={error ?? '暂无患者数据'} />
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  const latest = view.vitalSigns[view.vitalSigns.length - 1];
  const chartX = view.vitalSigns.map((v) => new Date(v.measureTime).getHours() + ':00');
  const hrData = view.vitalSigns.map((v) => v.heartRate ?? 0);
  const bpData = view.vitalSigns.map((v) => v.systolic ?? 0);

  const criticalCount = view.labReports.reduce(
    (n, r) => n + r.items.filter((i) => i.flag === 'critical').length,
    0,
  );

  /* 医嘱列 */
  const orderColumns: ColumnsType<OrderRecord> = [
    {
      title: '类别',
      dataIndex: 'category',
      width: 96,
      render: (c: OrderCategory) => <Tag>{ORDER_CATEGORY[c]}</Tag>,
    },
    {
      title: '医嘱内容',
      dataIndex: 'content',
      render: (_, o) => (
        <div>
          <Text style={{ fontWeight: o.priority === 'stat' ? 600 : 400 }}>{o.content}</Text>
          {o.dosage && <Text type="secondary"> · {o.dosage}</Text>}
          {o.frequency && <Text type="secondary"> · {o.frequency}</Text>}
          {o.priority === 'stat' && (
            <Tag color="red" style={{ marginLeft: 6 }}>
              立即
            </Tag>
          )}
          {o.priority === 'urgent' && (
            <Tag color="orange" style={{ marginLeft: 6 }}>
              加急
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'longTerm',
      width: 76,
      render: (v: boolean) => (v ? '长期' : '临时'),
    },
    { title: '开始', dataIndex: 'startDate', width: 116, render: (t: string) => fmtShort(t) },
    { title: '开嘱医生', dataIndex: 'doctorName', width: 132 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 92,
      render: (s: OrderStatus) => <Tag color={ORDER_STATUS[s].color}>{ORDER_STATUS[s].label}</Tag>,
    },
  ];

  return (
    <PageContainer
      title="患者360视图"
      description={currentPatient.diagnosis}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>
          返回列表
        </Button>
      }
    >
      {alerts.map((a) => (
        <AlertBanner key={a.id} alert={a} />
      ))}

      <Tabs
        defaultActiveKey="overview"
        items={[
          /* ------------------------- 概览 ------------------------- */
          {
            key: 'overview',
            label: '概览',
            children: (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={10}>
                    <PatientInfoCard patient={currentPatient} />
                  </Col>
                  <Col xs={24} lg={14}>
                    <VitalSignsPanel data={latest} />
                  </Col>
                </Row>
                <div className="jl-card mt-4 p-4">
                  <h3 className="m-0 mb-2 text-base font-medium">生命体征趋势（24h）</h3>
                  <LineChart
                    xData={chartX}
                    series={[
                      { name: '心率', data: hrData },
                      { name: '收缩压', data: bpData },
                    ]}
                    height={280}
                  />
                </div>
              </>
            ),
          },

          /* ------------------------ 就诊记录 ------------------------ */
          {
            key: 'encounters',
            label: `就诊记录 (${view.encounters.length})`,
            children:
              view.encounters.length === 0 ? (
                <Empty description="暂无就诊记录" />
              ) : (
                <Card>
                  <Timeline
                    items={view.encounters.map((e) => ({
                      color: e.type === 'emergency' ? 'red' : e.type === 'inpatient' ? 'blue' : 'green',
                      children: (
                        <div>
                          <div className="mb-1">
                            <Tag color={ENCOUNTER_META[e.type].color}>{ENCOUNTER_META[e.type].label}</Tag>
                            <Text strong>{e.deptName}</Text>
                            <Tag className="ml-2" color={e.status === 'ongoing' ? 'processing' : 'default'}>
                              {e.status === 'ongoing' ? '进行中' : '已结束'}
                            </Tag>
                          </div>
                          <div>
                            <Text type="secondary">就诊号：</Text>
                            {e.encounterNo}
                          </div>
                          {e.chiefComplaint && (
                            <div>
                              <Text type="secondary">主诉：</Text>
                              {e.chiefComplaint}
                            </div>
                          )}
                          <div>
                            <Text type="secondary">接诊医生：</Text>
                            {e.doctorName} · <Text type="secondary">{fmt(e.startTime)}</Text>
                          </div>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              ),
          },

          /* ------------------------ 检验检查 ------------------------ */
          {
            key: 'labs',
            label: (
              <span>
                检验检查
                {criticalCount > 0 && <Badge count={criticalCount} style={{ backgroundColor: '#cf1322', marginLeft: 6 }} />}
              </span>
            ),
            children: (
              <div className="flex flex-col gap-4">
                {view.labReports.length === 0 && <Empty description="暂无检验报告" />}
                {view.labReports.map((r: LabReport) => (
                  <Card
                    key={r.id}
                    size="small"
                    title={
                      <span>
                        <Tag color={r.status === 'critical' ? 'red' : r.status === 'final' ? 'green' : 'orange'}>
                          {r.status === 'critical' ? '危急' : r.status === 'final' ? '已审核' : '初报'}
                        </Tag>
                        {r.category}
                        <Text type="secondary" className="ml-2" style={{ fontSize: 12 }}>
                          {r.reportNo} · {fmtShort(r.reportTime)} · {r.reporter}
                        </Text>
                      </span>
                    }
                  >
                    <Table
                      size="small"
                      rowKey="name"
                      pagination={false}
                      dataSource={r.items}
                      columns={[
                        { title: '检验项目', dataIndex: 'name', render: (v) => <Text>{v}</Text> },
                        {
                          title: '结果',
                          dataIndex: 'value',
                          width: 180,
                          render: (_, it) => <LabValueTag flag={it.flag} value={it.value} unit={it.unit} />,
                        },
                        { title: '参考范围', dataIndex: 'refRange', width: 140 },
                      ]}
                    />
                  </Card>
                ))}

                <Card size="small" title={`影像 / 辅检报告（${view.imagings.length}）`}>
                  {view.imagings.length === 0 ? (
                    <Empty description="暂无影像报告" />
                  ) : (
                    <Collapse
                      items={view.imagings.map((im: ImagingReport) => ({
                        key: im.id,
                        label: (
                          <span>
                            <Tag color="geekblue">{im.modality}</Tag>
                            <Text strong>{im.part}</Text>
                            <Text type="secondary" className="ml-2" style={{ fontSize: 12 }}>
                              {im.reportNo} · {fmtShort(im.reportTime)}
                            </Text>
                          </span>
                        ),
                        children: (
                          <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="影像所见">{im.finding}</Descriptions.Item>
                            <Descriptions.Item label="诊断意见">
                              <Text strong>{im.impression}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="报告医生">
                              {im.reporter} · {fmt(im.reportTime)}
                            </Descriptions.Item>
                          </Descriptions>
                        ),
                      }))}
                    />
                  )}
                </Card>

                {/* AI 辅诊（DAMO-RADAR）：复用独立报告组件，内嵌于影像 tab */}
                <Card
                  size="small"
                  title="AI 辅诊报告（DAMO-RADAR）"
                  extra={
                    <Tag color="orange" icon={<RobotOutlined />}>
                      第二阅片 · 需医师复核
                    </Tag>
                  }
                >
                  <ImagingAiReport embedded studyUid={`STUDY-${view.patient.id}`} />
                </Card>
              </div>
            ),
          },

          /* ------------------------- 医嘱 ------------------------- */
          {
            key: 'orders',
            label: `医嘱 (${view.orders.length})`,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={view.orders}
                  columns={orderColumns}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  rowClassName={(o) => (o.status === 'stopped' ? 'jl-row-muted' : '')}
                />
              </Card>
            ),
          },

          /* ------------------------ 病历文书 ------------------------ */
          {
            key: 'documents',
            label: `病历文书 (${view.documents.length})`,
            children: (
              <Card>
                <Timeline
                  items={view.documents.map((d: MedicalDocument) => ({
                    color: d.status === 'audited' ? 'blue' : d.status === 'signed' ? 'green' : 'gray',
                    children: (
                      <div>
                        <div className="mb-1">
                          <Tag>{DOC_TYPE[d.docType]}</Tag>
                          <Text strong>{d.title}</Text>
                          <Tag className="ml-2" color={DOC_STATUS[d.status].color}>
                            {DOC_STATUS[d.status].label}
                          </Tag>
                        </div>
                        <Paragraph className="mb-1" type="secondary" style={{ marginBottom: 4 }}>
                          {d.summary}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {d.authorName} · {fmt(d.recordTime)}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              </Card>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
