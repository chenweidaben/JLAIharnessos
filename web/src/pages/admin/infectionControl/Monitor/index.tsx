/**
 * 健澜科技 jlmedaios - M141-D 院感实时监测页（管理驾驶舱，仅 admin）
 *
 * 【质量与安全】核心诉求：实时预警，不能等爆发了才发现。
 *   - 顶部四张核心指标卡：手术部位感染率 / 导管相关血流感染率 / 呼吸机相关肺炎率 / 多重耐药菌检出率；
 *   - 红色聚集预警条：同科室同类型 24h 内 ≥2 例自动标红，院感科立即介入；
 *   - 右侧/下方：一线随手上报表单（POST /api/v1/admin/infection/report），
 *     上报即实时判定是否触发聚集预警，不等月报、不等暴发。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无事件）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 对齐的类型 ---------------- */

type InfectionType = 'ssi' | 'clabsi' | 'vap' | 'mdro';
type InfectionSource = 'nurse' | 'doctor' | 'microbiology' | 'surveillance' | 'other';

interface InfectionEvent {
  id: string;
  patientId: string;
  dept: string;
  type: InfectionType;
  source: InfectionSource;
  reportedAt: string;
  autoAlert: boolean;
}

interface SpreadAlert {
  dept: string;
  type: InfectionType;
  count: number;
  patientIds: string[];
  windowHours: number;
  message: string;
}

interface MetricSummary {
  type: InfectionType;
  label: string;
  cases: number;
  denominator: number;
  unit: string;
  rate: number;
}

interface EventsView {
  generatedAt: string;
  period: string;
  totalEvents: number;
  autoAlertCount: number;
  events: InfectionEvent[];
  spreadAlerts: SpreadAlert[];
  monthlySummary: { metrics: MetricSummary[]; totalEvents: number };
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const TYPE_LABEL: Record<InfectionType, string> = {
  ssi: '手术部位感染',
  clabsi: '导管相关血流感染',
  vap: '呼吸机相关肺炎',
  mdro: '多重耐药菌',
};

const SOURCE_LABEL: Record<InfectionSource, string> = {
  nurse: '护士上报',
  doctor: '医生上报',
  microbiology: '微生物科',
  surveillance: '专职人员',
  other: '其他',
};

export default function InfectionControlMonitorPage() {
  const [data, setData] = useState<EventsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/infection/events');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as EventsView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (values: { patientId: string; dept: string; type: InfectionType; source: InfectionSource }) => {
    setSubmitting(true);
    setReportResult(null);
    try {
      const resp = await fetch('/api/v1/admin/infection/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setReportResult({ ok: false, text: json.message || '上报失败' });
        return;
      }
      const d = json.data as { autoAlert: boolean; message: string };
      setReportResult({ ok: d.autoAlert, text: d.message });
      form.resetFields();
      void load();
    } catch (e) {
      setReportResult({ ok: false, text: e instanceof Error ? e.message : '网络异常' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '事件号', dataIndex: 'id', key: 'id', width: 90 },
    { title: '患者', dataIndex: 'patientId', key: 'patientId', width: 110 },
    { title: '科室', dataIndex: 'dept', key: 'dept', width: 140 },
    {
      title: '感染类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: InfectionType) => <Tag color={VI.accent}>{TYPE_LABEL[t]}</Tag>,
    },
    { title: '来源', dataIndex: 'source', key: 'source', width: 110, render: (s: InfectionSource) => SOURCE_LABEL[s] ?? s },
    {
      title: '聚集预警',
      dataIndex: 'autoAlert',
      key: 'autoAlert',
      width: 110,
      render: (a: boolean) =>
        a ? <Tag color="error">自动预警</Tag> : <Tag color="default">正常</Tag>,
    },
    { title: '上报时间', dataIndex: 'reportedAt', key: 'reportedAt', render: (t: string) => new Date(t).toLocaleString('zh-CN') },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          院感实时监测 · 事件上报与聚集追踪
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【质量与安全】实时预警，不等暴发 · 同科室同类型 24h 内 ≥2 例自动标红 · 账期{' '}
          {data?.period ?? '-'} · 累计事件 {data?.totalEvents ?? 0} 例
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在聚合院感实时信号…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 四类核心监测指标率值卡 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {data.monthlySummary.metrics.map((m) => (
                <Col xs={24} sm={12} md={6} key={m.type}>
                  <Card
                    size="small"
                    style={{ borderTop: `4px solid ${VI.accent}` }}
                    title={<Text strong>{m.label}</Text>}
                  >
                    <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>{m.rate}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {m.unit} · 本月 {m.cases} 例 / 分母 {m.denominator}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 【质量与安全】红色聚集预警条 */}
            {(data.spreadAlerts.length > 0 || data.autoAlertCount > 0) && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={`发现 ${data.spreadAlerts.length} 项同科室同类型聚集预警（自动预警事件 ${data.autoAlertCount} 例），请院感科立即介入流调与隔离处置。`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {data.spreadAlerts.map((a, i) => (
                      <li key={i}>
                        {a.message}（{a.count} 例：{a.patientIds.join('、')}）
                      </li>
                    ))}
                  </ul>
                }
              />
            )}

            <Row gutter={[16, 16]}>
              {/* 事件台账 */}
              <Col xs={24} lg={16}>
                <Card title="院感上报事件台账" size="small">
                  {data.events.length === 0 ? (
                    <Alert type="info" showIcon message="暂无院感事件。一线上报后将实时展示，并自动判定聚集预警。" />
                  ) : (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={columns}
                      dataSource={data.events}
                      pagination={{ pageSize: 8, size: 'small' }}
                    />
                  )}
                </Card>
              </Col>

              {/* 一线上报表单 */}
              <Col xs={24} lg={8}>
                <Card title="一线随手上报（实时）" size="small">
                  <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ source: 'nurse' }}>
                    <Form.Item
                      label="患者内部编码"
                      name="patientId"
                      rules={[{ required: true, message: '请输入患者编码' }]}
                    >
                      <Input placeholder="如 p-1001" />
                    </Form.Item>
                    <Form.Item label="科室" name="dept" rules={[{ required: true, message: '请输入科室' }]}>
                      <Input placeholder="如 重症医学科" />
                    </Form.Item>
                    <Form.Item label="感染类型" name="type" rules={[{ required: true, message: '请选择感染类型' }]}>
                      <Select
                        options={(Object.keys(TYPE_LABEL) as InfectionType[]).map((t) => ({
                          value: t,
                          label: TYPE_LABEL[t],
                        }))}
                      />
                    </Form.Item>
                    <Form.Item label="上报来源" name="source">
                      <Select
                        options={(Object.keys(SOURCE_LABEL) as InfectionSource[]).map((s) => ({
                          value: s,
                          label: SOURCE_LABEL[s],
                        }))}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ background: VI.deep }}>
                          上报并实时判定
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>

                  {reportResult && (
                    <Alert
                      style={{ marginTop: 8 }}
                      type={reportResult.ok ? 'error' : 'success'}
                      showIcon
                      message={reportResult.text}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
