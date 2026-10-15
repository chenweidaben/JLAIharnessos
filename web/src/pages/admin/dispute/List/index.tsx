/**
 * 健澜科技 jlmedaios - M141-C 医疗纠纷管理页（质量与安全，仅 admin）
 *
 * 展示 BFF /api/v1/admin/disputes 的纠纷台账与月度趋势：
 *   服务态度 / 医疗质量 / 费用争议 / 沟通问题 / 其他五类纠纷统一登记，
 *   按「登记 → 调查中 → 协商中 → 已解决 / 已诉讼」闭环流转——
 *   保护医生，也保护患者：全程留痕，责任与诉求双线可追溯。
 *
 * 核心红线：patientId 入页即已脱敏（P0****23），前端绝不接触患者明文标识。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无纠纷）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
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
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type DisputeType =
  | 'service_attitude'
  | 'medical_quality'
  | 'fee_dispute'
  | 'communication'
  | 'other';

type DisputeStatus =
  | 'registered'
  | 'investigating'
  | 'negotiating'
  | 'resolved'
  | 'litigated';

interface Dispute {
  id: string;
  patientId: string;
  visitId: string;
  type: DisputeType;
  typeLabel: string;
  description: string;
  status: DisputeStatus;
  statusLabel: string;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputeTypeStat {
  type: DisputeType;
  typeLabel: string;
  count: number;
}

interface DisputeStatusStat {
  status: DisputeStatus;
  statusLabel: string;
  count: number;
}

interface DisputeTrend {
  period: string;
  total: number;
  resolvedCount: number;
  litigatedCount: number;
  openCount: number;
  resolutionRate: number;
  byType: DisputeTypeStat[];
  byStatus: DisputeStatusStat[];
}

interface DisputeView {
  disputes: Dispute[];
  trend: DisputeTrend;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 纠纷类型标签配色（质量与安全看板） */
const TYPE_COLOR: Record<DisputeType, string> = {
  service_attitude: 'cyan',
  medical_quality: 'red',
  fee_dispute: 'gold',
  communication: 'geekblue',
  other: 'default',
};

/** 状态标签配色：在办暖色，终态绿/红 */
const STATUS_COLOR: Record<DisputeStatus, string> = {
  registered: 'blue',
  investigating: 'orange',
  negotiating: 'gold',
  resolved: 'green',
  litigated: 'red',
};

/** 登记表单类型选项（中文标签入参，BFF 自动归代码） */
const TYPE_OPTIONS = [
  { value: '服务态度', label: '服务态度' },
  { value: '医疗质量', label: '医疗质量' },
  { value: '费用争议', label: '费用争议' },
  { value: '沟通问题', label: '沟通问题' },
  { value: '其他', label: '其他' },
];

export default function DisputeListPage() {
  const [data, setData] = useState<DisputeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/disputes');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DisputeView);
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

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '登记失败', content: json.message || '请稍后重试' });
      } else {
        setModalOpen(false);
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const disputeColumns: ColumnsType<Dispute> = [
    {
      title: '患者（已脱敏）',
      dataIndex: 'patientId',
      width: 120,
      render: (v: string) => <Text code>{v}</Text>,
    },
    { title: '关联就诊号', dataIndex: 'visitId', width: 110, render: (v: string) => v || '—' },
    {
      title: '纠纷类型',
      dataIndex: 'type',
      width: 100,
      render: (t: DisputeType, row) => <Tag color={TYPE_COLOR[t]}>{row.typeLabel}</Tag>,
    },
    { title: '纠纷经过 / 诉求', dataIndex: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: DisputeStatus, row) => <Tag color={STATUS_COLOR[s]}>{row.statusLabel}</Tag>,
    },
    {
      title: '处理结果',
      dataIndex: 'resolution',
      width: 160,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">在办中</Text>,
    },
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  const trend = data?.trend;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              医疗纠纷管理 · 质量与安全
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              登记 → 调查中 → 协商中 → 已解决 / 已诉讼 · 保护医生，也保护患者
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={openCreate}>
              登记纠纷
            </Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载纠纷台账…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && !data && <Alert type="info" showIcon message="暂无纠纷数据。" />}

        {!loading && !error && data && trend && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={`纠纷总量（${trend.period}）`} value={trend.total} suffix="件" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="在办纠纷" value={trend.openCount} suffix="件" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="闭环率"
                    value={Math.round(trend.resolutionRate * 100)}
                    suffix="%"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="已诉讼" value={trend.litigatedCount} suffix="件" />
                </Card>
              </Col>
            </Row>

            {/* 分类别 + 分状态汇总 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="分类别纠纷计数" size="small">
                  {trend.byType.length === 0 ? (
                    <Alert type="info" showIcon message="本账期暂无纠纷。" />
                  ) : (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {trend.byType.map((t) => (
                        <Row key={t.type} justify="space-between" align="middle">
                          <Tag color={TYPE_COLOR[t.type]}>{t.typeLabel}</Tag>
                          <Text strong>{t.count} 件</Text>
                        </Row>
                      ))}
                    </Space>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="分状态分布" size="small">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {trend.byStatus.map((s) => (
                      <Row key={s.status} justify="space-between" align="middle">
                        <Tag color={STATUS_COLOR[s.status]}>{s.statusLabel}</Tag>
                        <Text strong>{s.count} 件</Text>
                      </Row>
                    ))}
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* 纠纷台账 */}
            <Card title="纠纷台账（患者标识已脱敏）" size="small">
              {data.disputes.length === 0 ? (
                <Alert type="info" showIcon message="暂无纠纷登记，点击右上角「登记纠纷」创建。" />
              ) : (
                <Table rowKey="id" columns={disputeColumns} dataSource={data.disputes} pagination={{ pageSize: 10 }} size="middle" />
              )}
            </Card>
          </>
        )}
      </Content>

      {/* 登记纠纷弹窗 */}
      <Modal
        title="登记医疗纠纷"
        open={modalOpen}
        onOk={submit}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        okText="确认登记"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="patientId" label="患者标识" rules={[{ required: true, message: '请输入患者标识（入页自动脱敏）' }]}>
            <Input placeholder="如 P000123（存储时自动脱敏为 P0****23）" />
          </Form.Item>
          <Form.Item name="visitId" label="关联就诊号">
            <Input placeholder="如 V20261016001（可空）" />
          </Form.Item>
          <Form.Item name="type" label="纠纷类型" rules={[{ required: true, message: '请选择纠纷类型' }]}>
            <Select placeholder="选择纠纷类型" options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="纠纷经过 / 患者诉求" rules={[{ required: true, message: '请描述纠纷经过' }]}>
            <Input.TextArea rows={4} placeholder="客观记录患方诉求与经过，避免定性表述" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
