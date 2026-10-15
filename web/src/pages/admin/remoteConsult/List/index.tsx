/**
 * 健澜科技 jlmedaios - M143-B 远程会诊管理页（互联网医院与远程医疗）
 *
 * 展示 BFF /api/v1/remote-consult/list 的会诊单台账，覆盖三类会诊：
 *   院内多学科会诊(MDT) / 院间远程会诊 / 国际远程会诊，并提供：
 *   - 发起会诊（POST /api/v1/remote-consult/request）；
 *   - 专家接受（PUT /api/v1/remote-consult/:id/accept）；
 *   - 提交会诊报告（PUT /api/v1/remote-consult/:id/report）。
 *
 * 核心红线：急会诊 urgent=true，2 小时内必须有专家接受；
 *   超 2h 未接受自动升级（escalated）红色警示，调度台加急催办。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无会诊单）。
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

type ConsultType = 'mdt' | 'inter_hospital' | 'international';
type ConsultStatus = 'requested' | 'accepted' | 'reported';

interface Consult {
  id: string;
  consultType: ConsultType;
  consultTypeLabel: string;
  reqDept: string;
  reqDoctor: string;
  patientId: string;
  reason: string;
  expertHospital: string;
  experts: string[];
  acceptedExperts: string[];
  urgent: boolean;
  status: ConsultStatus;
  requestedAt: string;
  acceptDeadlineAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
  report?: string;
  reportedAt?: string;
  escalated: boolean;
  escalationMessage?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const TYPE_COLOR: Record<ConsultType, string> = {
  mdt: 'geekblue',
  inter_hospital: 'cyan',
  international: 'purple',
};

const STATUS_META: Record<ConsultStatus, { label: string; color: string }> = {
  requested: { label: '待接受', color: 'orange' },
  accepted: { label: '已接受', color: 'blue' },
  reported: { label: '已出报告', color: 'green' },
};

export default function RemoteConsultListPage() {
  const [data, setData] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<Consult | null>(null);
  const [reportText, setReportText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/remote-consult/list');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData([]);
        return;
      }
      setData((json.data as { consults: Consult[] }).consults ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitRequest = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/remote-consult/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '申请失败', content: json.message || '请稍后重试' });
      } else {
        setRequestOpen(false);
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const accept = async (row: Consult) => {
    // 接受会诊：默认以第一位未接受专家身份接受；MDT 可在弹窗中逐位接受
    const pending = row.experts.find((e) => !row.acceptedExperts.includes(e));
    const expert = pending ?? row.experts[0];
    try {
      const resp = await fetch(`/api/v1/remote-consult/${encodeURIComponent(row.id)}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertDoctor: expert }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '接受失败', content: json.message || '请稍后重试' });
      } else {
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    }
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/remote-consult/${encodeURIComponent(reportTarget.id)}/report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: reportText }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '提交报告失败', content: json.message || '请稍后重试' });
      } else {
        setReportTarget(null);
        setReportText('');
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Consult> = [
    {
      title: '类型',
      dataIndex: 'consultType',
      width: 150,
      render: (t: ConsultType, row) => (
        <Space direction="vertical" size={0}>
          <Tag color={TYPE_COLOR[t]}>{row.consultTypeLabel}</Tag>
          {row.urgent && <Tag color="red">急会诊·2h</Tag>}
        </Space>
      ),
    },
    { title: '患者', dataIndex: 'patientId', width: 90 },
    {
      title: '申请',
      dataIndex: 'reqDept',
      width: 140,
      render: (_: string, row) => (
        <Text>
          {row.reqDept} · {row.reqDoctor}
        </Text>
      ),
    },
    { title: '受邀机构', dataIndex: 'expertHospital', width: 140, render: (v: string) => v || '院内（MDT）' },
    {
      title: '专家接受',
      dataIndex: 'acceptedExperts',
      width: 180,
      render: (_: string[], row) => (
        <Text>
          {row.acceptedExperts.length}/{row.experts.length} 已接受
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: ConsultStatus) => {
        const meta = STATUS_META[s];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '时效升级',
      dataIndex: 'escalated',
      width: 120,
      render: (esc: boolean, row) =>
        esc ? (
          <Tag color="red">已升级催办</Tag>
        ) : row.urgent && row.status === 'requested' ? (
          <Tag color="orange">2h 倒计时</Tag>
        ) : (
          <Tag>-</Tag>
        ),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 200,
      render: (_: string, row) => (
        <Space>
          {row.status === 'requested' && <Button size="small" onClick={() => accept(row)}>接受会诊</Button>}
          {row.status === 'accepted' && (
            <Button size="small" type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => { setReportTarget(row); setReportText(''); }}>
              提交报告
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const requestedCount = data.filter((c) => c.status === 'requested').length;
  const urgentCount = data.filter((c) => c.urgent).length;
  const escalatedCount = data.filter((c) => c.escalated).length;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              远程会诊 · 急会诊 2 小时内响应
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              院内多学科会诊(MDT) / 院间远程会诊 / 国际远程会诊 · 打破围墙，专家协同
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => { form.resetFields(); setRequestOpen(true); }}>
              发起会诊
            </Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 超期升级警示横幅 */}
        {data.some((c) => c.escalated) && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={data.find((c) => c.escalated)?.escalationMessage ?? '存在急会诊超 2 小时未接受，请立即催办'}
          />
        )}

        {/* 核心指标卡 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="会诊单总数" value={data.length} suffix="张" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="待接受" value={requestedCount} suffix="张" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="急会诊" value={urgentCount} suffix="张" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="超期升级" value={escalatedCount} suffix="张" valueStyle={{ color: escalatedCount ? '#cf1322' : undefined }} />
            </Card>
          </Col>
        </Row>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载会诊单…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && data.length === 0 && (
          <Alert type="info" showIcon message="暂无会诊单，点击右上角「发起会诊」创建一张院内MDT / 院间 / 国际远程会诊。" />
        )}

        {!loading && !error && data.length > 0 && (
          <Card title="远程会诊台账" size="small">
            <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 10 }} size="middle" />
          </Card>
        )}
      </Content>

      {/* 发起会诊弹窗 */}
      <Modal
        title="发起远程会诊"
        open={requestOpen}
        onOk={submitRequest}
        confirmLoading={submitting}
        onCancel={() => setRequestOpen(false)}
        okText="提交申请"
        width={620}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="院内 MDT：受邀机构留空、专家可填「张主任,李主任」多人；院间 / 国际：填写外院机构名。会诊原因含「急」即急会诊，2 小时内须有专家接受。"
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reqDept" label="申请科室" rules={[{ required: true, message: '请输入申请科室' }]}>
                <Input placeholder="如 普外科" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reqDoctor" label="申请医生" rules={[{ required: true, message: '请输入申请医生' }]}>
                <Input placeholder="如 陈医生" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="patientId" label="患者标识" rules={[{ required: true, message: '请输入患者标识' }]}>
            <Input placeholder="如 P10086" />
          </Form.Item>
          <Form.Item name="reason" label="会诊原因 / 病情摘要" rules={[{ required: true, message: '请输入会诊原因' }]}>
            <Input.TextArea rows={3} placeholder="如：急会诊，术后呼吸困难请多学科协同" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="expertHospital" label="受邀机构（院内 MDT 留空）">
                <Input placeholder="如 省立医院 / 梅奥国际（含「国际」）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expertDoctor" label="受邀专家（MDT 多人用逗号分隔）" rules={[{ required: true, message: '请输入受邀专家' }]}>
                <Input placeholder="如 张主任,李主任,王主任" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 提交报告弹窗 */}
      <Modal
        title={`提交会诊报告（患者 ${reportTarget?.patientId ?? ''}）`}
        open={reportTarget !== null}
        onOk={submitReport}
        confirmLoading={submitting}
        onCancel={() => setReportTarget(null)}
        okText="提交报告"
        width={620}
      >
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="报告由接受会诊的专家本人提交并留痕，AI 不自动出具报告。" />
        <Input.TextArea rows={6} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="请输入会诊意见与建议…" />
      </Modal>
    </Layout>
  );
}
