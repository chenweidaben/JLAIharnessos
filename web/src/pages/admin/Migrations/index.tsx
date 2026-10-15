/**
 * 健澜科技 jlmedaios - M124-C 数据库迁移状态面板（仅 admin）
 *
 * 【运维工具】
 * 展示迁移总数 / 已执行 / 待执行 / 失败数、最近执行 10 条、失败明细，
 * 并提供「执行待执行迁移」按钮触发 POST /api/v1/admin/migrate/run。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无迁移文件）。
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
  Layout,
  Popconfirm,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF getMigrationStatus 输出对齐 */
interface MigrationRow {
  version: string;
  filename: string;
  status: 'executed' | 'pending' | 'failed';
  executedAt?: string;
  error?: string;
  durationMs?: number;
}

interface MigrationSummary {
  total: number;
  executed: number;
  pending: number;
  recent10: MigrationRow[];
  failures: MigrationRow[];
}

/** POST 执行结果 */
interface RunResult {
  version: string;
  filename: string;
  success: boolean;
  error?: string;
  durationMs: number;
  ranAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function statusTag(status: MigrationRow['status']) {
  if (status === 'executed') return <Tag color="green">已执行</Tag>;
  if (status === 'pending') return <Tag color="orange">待执行</Tag>;
  return <Tag color="red">失败</Tag>;
}

export default function MigrationsPage() {
  const [data, setData] = useState<MigrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/migrations');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as MigrationSummary);
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

  const runPending = async () => {
    setRunning(true);
    try {
      const resp = await fetch('/api/v1/admin/migrate/run', { method: 'POST' });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '迁移执行失败');
        return;
      }
      const results = (json.data?.results ?? []) as RunResult[];
      const okCount = results.filter((r) => r.success).length;
      const failCount = results.length - okCount;
      if (failCount > 0) {
        message.warning(`执行完成：成功 ${okCount}，失败 ${failCount}`);
      } else if (results.length === 0) {
        message.info(json.data?.message ?? '没有待执行的迁移');
      } else {
        message.success(`成功执行 ${okCount} 个迁移`);
      }
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setRunning(false);
    }
  };

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
          数据库迁移状态
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          运维工具 · 仅 admin 可见 · 扫描 deploy/postgres/init 并比对 schema_migrations
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载迁移状态中…" />
          </div>
        )}

        {/* error 态 */}
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

        {/* empty 态 */}
        {!loading && !error && data && data.total === 0 && (
          <Alert
            type="info"
            showIcon
            message="暂无迁移文件。请将 SQL 脚本放入 deploy/postgres/init 目录后刷新。"
          />
        )}

        {!loading && !error && data && data.total > 0 && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="迁移总数" value={data.total} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="已执行" value={data.executed} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="待执行"
                    value={data.pending}
                    valueStyle={{ color: data.pending > 0 ? '#cf1322' : undefined }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="失败"
                    value={data.failures.length}
                    valueStyle={{ color: data.failures.length > 0 ? '#cf1322' : undefined }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 操作按钮 */}
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Popconfirm
                title="确认执行待执行迁移？"
                description={
                  data.pending > 0 || data.failures.length > 0
                    ? `将顺序执行 ${data.pending + data.failures.length} 个待执行/失败迁移。`
                    : '当前没有待执行或失败的迁移。'
                }
                onConfirm={runPending}
                okText="执行"
                cancelText="取消"
                disabled={running || (data.pending === 0 && data.failures.length === 0)}
              >
                <Button
                  type="primary"
                  loading={running}
                  disabled={data.pending === 0 && data.failures.length === 0}
                  style={{ background: VI.accent, borderColor: VI.accent }}
                >
                  执行待执行迁移
                </Button>
              </Popconfirm>
            </div>

            {/* 最近执行 10 条 */}
            <Card title="最近执行（最近 10 条）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="version"
                pagination={false}
                dataSource={data.recent10}
                locale={{ emptyText: '暂无已执行迁移' }}
                columns={[
                  { title: '版本', dataIndex: 'filename', ellipsis: true },
                  { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
                  {
                    title: '执行时间',
                    dataIndex: 'executedAt',
                    width: 200,
                    render: (v?: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
                  },
                ]}
              />
            </Card>

            {/* 失败明细 */}
            <Card title={`失败明细（${data.failures.length}）`}>
              <Table
                rowKey="version"
                pagination={false}
                dataSource={data.failures}
                locale={{ emptyText: '暂无失败记录' }}
                columns={[
                  { title: '版本', dataIndex: 'filename', width: 220, ellipsis: true },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: statusTag,
                  },
                  {
                    title: '错误摘要',
                    dataIndex: 'error',
                    ellipsis: true,
                    render: (v?: string) =>
                      v ? <span style={{ color: '#cf1322' }}>{v}</span> : '-',
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
