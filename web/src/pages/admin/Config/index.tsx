/**
 * 健澜科技 jlmedaios - M124-A 系统配置中心页（运维工具，仅 admin）
 *
 * 【生产安全加固】
 *  - 展示 medmuse.system_config 全量配置，支持按分类筛选；
 *  - 行内编辑 value 后调用 PUT /api/v1/admin/config/:key 落库；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading（加载中）/ error（失败可重试）/ empty（配置为空兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Layout,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF GET /api/v1/admin/config 输出对齐 */
interface SystemConfigEntry {
  key: string;
  value: string;
  description: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
}

interface ConfigListResponse {
  total: number;
  items: SystemConfigEntry[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

const CATEGORY_COLOR: Record<string, string> = {
  auth: 'geekblue',
  notify: 'orange',
  feature: 'green',
  maintenance: 'volcano',
  general: 'default',
};

export default function SystemConfigPage() {
  const [data, setData] = useState<ConfigListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<string>('');
  // 行内草稿：key -> 编辑中的 value
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string>('');

  const load = async (cat = category) => {
    setLoading(true);
    setError('');
    try {
      const qs = cat ? `?category=${encodeURIComponent(cat)}` : '';
      const resp = await fetch(`/api/v1/admin/config${qs}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载系统配置失败');
        setData(null);
        return;
      }
      setData(json.data as ConfigListResponse);
      setDraft({});
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.items.map((it) => it.category).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const save = async (row: SystemConfigEntry) => {
    const next = draft[row.key];
    if (next === undefined || next === row.value) {
      message.info('值未变化');
      return;
    }
    setSavingKey(row.key);
    try {
      const resp = await fetch(`/api/v1/admin/config/${encodeURIComponent(row.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '保存失败');
        return;
      }
      message.success(`已保存：${row.key}`);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            borderLeft: `4px solid ${VI.deep}`,
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            系统配置中心
          </Title>
          <Paragraph type="secondary">
            运维工具：在线调整运行参数，无需发版；仅系统管理员可读写。变更将记录操作人工号与时间。
          </Paragraph>
        </div>

        {/* 分类筛选 */}
        <Space style={{ marginBottom: 16 }}>
          <Text type="secondary">分类：</Text>
          <Select
            allowClear
            placeholder="全部分类"
            style={{ width: 200 }}
            value={category || undefined}
            onChange={(v) => {
              const next = v ?? '';
              setCategory(next);
              void load(next);
            }}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
          <Button onClick={() => void load()}>刷新</Button>
        </Space>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载系统配置中…" />
          </div>
        )}

        {/* error 态 */}
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

        {/* empty 态 */}
        {!loading && !error && (!data || data.items.length === 0) && (
          <Alert type="info" showIcon message="暂无系统配置，待运维初始化后自动展示。" />
        )}

        {/* 主内容 */}
        {!loading && !error && data && data.items.length > 0 && (
          <Card
            title={`配置项（共 ${data.total} 条）`}
            headStyle={{ background: VI.deep, color: '#fff' }}
          >
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={data.items}
              columns={[
                {
                  title: '配置键',
                  dataIndex: 'key',
                  render: (k: string) => (
                    <Text strong style={{ color: VI.deep }}>
                      {k}
                    </Text>
                  ),
                },
                {
                  title: '分类',
                  dataIndex: 'category',
                  width: 120,
                  render: (c: string) => (
                    <Tag color={CATEGORY_COLOR[c] ?? 'default'}>{c || 'general'}</Tag>
                  ),
                },
                {
                  title: '当前值',
                  dataIndex: 'value',
                  width: 220,
                  render: (_: string, row) => (
                    <Input
                      size="small"
                      value={draft[row.key] ?? row.value}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                      }
                      disabled={savingKey === row.key}
                    />
                  ),
                },
                {
                  title: '说明',
                  dataIndex: 'description',
                  ellipsis: true,
                },
                {
                  title: '最近更新',
                  dataIndex: 'updatedAt',
                  width: 180,
                  render: (t: string) =>
                    t ? new Date(t).toLocaleString('zh-CN') : '-',
                },
                {
                  title: '操作人',
                  dataIndex: 'updatedBy',
                  width: 120,
                },
                {
                  title: '操作',
                  width: 100,
                  render: (_: unknown, row) => (
                    <Button
                      type="link"
                      size="small"
                      loading={savingKey === row.key}
                      onClick={() => void save(row)}
                    >
                      保存
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
