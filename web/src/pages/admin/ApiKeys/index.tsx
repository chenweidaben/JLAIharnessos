/**
 * 健澜科技 jlmedaios - M129-B 第三方对接 API Key 管理页（系统集成，仅 admin）
 *
 * 【系统集成】为第三方对接方（区域卫生平台 / 医联体协同）签发与管理 API Key：
 *  - 签发：填写对接方名称、勾选数据面权限、设置有效期（默认 90 天）；
 *  - 明文 Key 仅在签发成功弹窗中展示一次，复制后关闭即不可再查；
 *  - 台账列表：展示 Key 前缀 / 名称 / 权限 / 状态 / 有效期 / 最近使用时刻，
 *    永不展示哈希与明文。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无 Key 提示）。
 * 深海蓝 VI：主色 #0b3d6b。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA_BLUE = '#0b3d6b';

/** 与后端 OPEN_API_PERMISSIONS 白名单对齐 */
const PERMISSION_OPTIONS = [
  { label: '患者基本信息（patient:read）', value: 'patient:read' },
  { label: '就诊记录（patient:visits:read）', value: 'patient:visits:read' },
  { label: '处方记录（patient:prescriptions:read）', value: 'patient:prescriptions:read' },
];

/** 台账行（与 BFF GET 出参对齐；绝无 keyHash / 明文列） */
interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  status: string;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  note: string;
}

/** 签发成功响应（data.key 为明文，仅此一次） */
interface CreatedKey {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  status: string;
  expires_at: string;
  warning: string;
}

/** 状态标签配色 */
const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  revoked: 'red',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 19);
}

export default function ApiKeysPage() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [form] = Form.useForm<{ name: string; permissions: string[]; ttlDays: number; note: string }>();

  /** 拉取台账列表 */
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/api-keys');
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '加载 API Key 台账失败');
      const data = json.data as { total: number; items: ApiKeyItem[] };
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 签发新 Key */
  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          permissions: values.permissions,
          ttlDays: values.ttlDays,
          note: values.note ?? '',
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '签发失败');
      setCreated(json.data as CreatedKey);
      form.resetFields();
      message.success('API Key 已签发，请立即复制保存');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '签发失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 复制明文 Key 到剪贴板 */
  const copyKey = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      message.success('已复制到剪贴板');
    } catch {
      message.warning('复制失败，请手动选择文本复制');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Title level={3} style={{ color: DEEP_SEA_BLUE }}>
          第三方对接 API Key 管理
        </Title>
        <Paragraph type="secondary">
          系统集成：为区域卫生平台、医联体协同等第三方对接方签发独立 API Key。
          默认 90 天过期；Key 明文仅展示一次，库内只存哈希；仅管理员可见。
        </Paragraph>

        {/* 签发表单 */}
        <Card size="small" title="签发新 API Key" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            style={{ maxWidth: 640 }}
            initialValues={{ ttlDays: 90, permissions: ['patient:read'] }}
          >
            <Form.Item
              label="对接方名称"
              name="name"
              rules={[{ required: true, message: '请填写对接方名称' }, { max: 64 }]}
            >
              <Input placeholder="如：区域卫生平台 / 医联体-浙北院区" maxLength={64} />
            </Form.Item>
            <Form.Item
              label="授权数据面（最小权限，按需勾选）"
              name="permissions"
              rules={[{ required: true, message: '至少勾选一个数据面权限' }]}
            >
              <Checkbox.Group options={PERMISSION_OPTIONS} />
            </Form.Item>
            <Form.Item label="有效期（天，默认 90，最长 365）" name="ttlDays">
              <InputNumber min={1} max={365} />
            </Form.Item>
            <Form.Item label="用途说明 / 联系人" name="note">
              <Input.TextArea rows={2} maxLength={256} placeholder="选填" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                style={{ background: DEEP_SEA_BLUE }}
                loading={submitting}
                onClick={() => void handleCreate()}
              >
                签发 API Key
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* error 态 */}
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={<Button size="small" onClick={() => setError('')}>知道了</Button>}
          />
        )}

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载中…" />
          </div>
        )}

        {/* empty 态 */}
        {!loading && !error && items.length === 0 && (
          <Alert
            type="info"
            showIcon
            message="暂无 API Key"
            description="使用上方表单为对接方签发第一把 API Key。"
          />
        )}

        {/* 台账列表 */}
        {!loading && items.length > 0 && (
          <Card size="small" title={`对接凭证台账（${items.length}）`}>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={items}
              columns={[
                { title: 'Key 前缀', dataIndex: 'keyPrefix', width: 180 },
                { title: '对接方', dataIndex: 'name' },
                {
                  title: '权限',
                  dataIndex: 'permissions',
                  render: (perms: string[]) => (
                    <Space size={[4, 4]} wrap>
                      {(perms ?? []).map((p) => (
                        <Tag key={p} color="blue">{p}</Tag>
                      ))}
                    </Space>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (s: string) => (
                    <Tag color={STATUS_COLOR[s] ?? 'default'}>{s === 'active' ? '有效' : '已吊销'}</Tag>
                  ),
                },
                { title: '过期时刻', dataIndex: 'expiresAt', width: 170, render: formatTime },
                { title: '最近使用', dataIndex: 'lastUsedAt', width: 170, render: formatTime },
                { title: '创建人', dataIndex: 'createdBy', width: 110 },
              ]}
            />
          </Card>
        )}

        {/* 明文 Key 一次性弹窗 */}
        <Modal
          open={created !== null}
          title="API Key 已签发"
          onCancel={() => setCreated(null)}
          onOk={() => setCreated(null)}
          okText="我已妥善保存"
        >
          {created && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Alert type="warning" showIcon message={created.warning} />
              <Text copyable={{ text: created.key, tooltips: ['复制', '已复制'] }} strong style={{ fontSize: 16 }}>
                {created.key}
              </Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                <Text strong>对接方：</Text>{created.name}　
                <Text strong>过期时刻：</Text>{created.expires_at.replace('T', ' ').slice(0, 19)}
                <br />
                <Text strong>已授权：</Text>
                {created.permissions.join(', ')}
              </Paragraph>
              <Button onClick={() => void copyKey()}>复制 Key</Button>
            </Space>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}
