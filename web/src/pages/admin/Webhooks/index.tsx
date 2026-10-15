/**
 * 健澜科技 jlmedaios - M129-D 系统事件 Webhook 管理页（系统集成，仅 admin）
 *
 * 【系统集成】
 *  - 展示 medmuse.webhooks 全部外发订阅；
 *  - 表单登记新订阅：url（https）+ 事件多选 + 可选 secret；
 *  - 创建成功后弹出一次性 secret，提示管理员妥善保管（列表接口脱敏）；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF GET /api/v1/admin/webhooks 输出对齐 */
interface WebhookItem {
  id: number;
  url: string;
  events: string[];
  secretMask: string;
  status: 'active' | 'disabled';
  description: string;
  successCount: number;
  failureCount: number;
  nextRetryAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface ListResponse {
  total: number;
  items: WebhookItem[];
  events: string[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

const EVENT_COLOR: Record<string, string> = {
  'patient.created': 'geekblue',
  'prescription.created': 'green',
  'critical_result': 'volcano',
  'error.alert': 'red',
};

export default function WebhooksAdminPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string>('');
  const [form] = Form.useForm<{
    url: string;
    events: string[];
    description?: string;
  }>();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/webhooks');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载 webhook 列表失败');
        setData(null);
        return;
      }
      setData(json.data as ListResponse);
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

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: values.url,
          events: values.events,
          description: values.description ?? '',
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '登记失败');
        return;
      }
      message.success('webhook 已登记');
      setCreatedSecret(typeof json.data?.secret === 'string' ? json.data.secret : '');
      setModalOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            borderLeft: `4px solid ${VI.deep}`,
            paddingLeft: 12,
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            系统事件 Webhook
          </Title>
          <Paragraph type="secondary">
            系统集成：登记对外事件订阅（患者建档 / 处方开立 / 危急值 / 错误告警），
            BFF 以 HMAC-SHA256 签名外发；仅系统管理员可读写。
          </Paragraph>
        </div>

        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => setModalOpen(true)}>
            登记新订阅
          </Button>
          <Button onClick={() => void load()}>刷新</Button>
        </Space>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载 webhook 列表中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && (!data || data.items.length === 0) && (
          <Alert type="info" showIcon message="暂无外发订阅，点击「登记新订阅」接入第三方系统。" />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <Card
            title={`外发订阅（共 ${data.total} 条）`}
            headStyle={{ background: VI.deep, color: '#fff' }}
          >
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={data.items}
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  width: 70,
                },
                {
                  title: '外发地址',
                  dataIndex: 'url',
                  render: (u: string) => (
                    <Text strong style={{ color: VI.deep, wordBreak: 'break-all' }}>
                      {u}
                    </Text>
                  ),
                },
                {
                  title: '订阅事件',
                  dataIndex: 'events',
                  width: 260,
                  render: (events: string[]) => (
                    <Space wrap size={[4, 4]}>
                      {(events ?? []).map((e) => (
                        <Tag key={e} color={EVENT_COLOR[e] ?? 'default'}>
                          {e}
                        </Tag>
                      ))}
                    </Space>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (s: string) =>
                    s === 'active' ? <Tag color="green">active</Tag> : <Tag color="default">disabled</Tag>,
                },
                {
                  title: '签名密钥',
                  dataIndex: 'secretMask',
                  width: 140,
                  render: (m: string) => <Text code>{m}</Text>,
                },
                {
                  title: '成功/失败',
                  width: 110,
                  render: (_: unknown, row: WebhookItem) => (
                    <Text>
                      <Text style={{ color: '#389e0d' }}>{row.successCount}</Text>
                      {' / '}
                      <Text type="danger">{row.failureCount}</Text>
                    </Text>
                  ),
                },
                {
                  title: '登记人',
                  dataIndex: 'createdBy',
                  width: 110,
                },
                {
                  title: '登记时间',
                  dataIndex: 'createdAt',
                  width: 180,
                  render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-'),
                },
              ]}
            />
          </Card>
        )}

        {/* 登记新订阅弹窗 */}
        <Modal
          title="登记新 Webhook 订阅"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => void submit()}
          confirmLoading={submitting}
          okText="登记"
          cancelText="取消"
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="URL 必须为 https（开发环境仅允许 localhost）；事件从白名单多选；secret 留空则由服务端生成。"
          />
          <Form form={form} layout="vertical" initialValues={{ events: [] }}>
            <Form.Item
              label="外发地址 URL"
              name="url"
              rules={[
                { required: true, message: '请输入 webhook URL' },
                { pattern: /^https:\/\/.+/i, message: '仅允许 https（开发环境 http://localhost 例外）' },
              ]}
            >
              <Input placeholder="https://example.com/jlan/webhook" />
            </Form.Item>
            <Form.Item
              label="订阅事件"
              name="events"
              rules={[{ required: true, message: '至少订阅一个事件' }]}
            >
              <Select
                mode="multiple"
                placeholder="选择需要外发的事件"
                options={(data?.events ?? []).map((e) => ({ label: e, value: e }))}
              />
            </Form.Item>
            <Form.Item label="备注说明（医院 / 厂商 / 用途）" name="description">
              <Input placeholder="例：区域卫生平台 - 危急值上报" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 一次性 secret 展示 */}
        <Modal
          title="登记成功：请立即保存签名密钥"
          open={!!createdSecret}
          footer={[
            <Button key="ok" type="primary" onClick={() => setCreatedSecret('')}>
              我已妥善保存
            </Button>,
          ]}
        >
          <Alert
            type="warning"
            showIcon
            message="此密钥仅展示一次，关闭后无法再次查看。请分发给订阅方用于校验 x-jlan-signature 头。"
          />
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f5f7fa',
              border: `1px solid ${VI.accent}`,
              borderRadius: 4,
              wordBreak: 'break-all',
            }}
          >
            {createdSecret}
          </pre>
        </Modal>
      </Content>
    </Layout>
  );
}
