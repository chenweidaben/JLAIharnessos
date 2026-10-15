/**
 * 健澜科技 jlmedaios - M145-A 数据库慢查询与索引建议页（仅 admin · 生产化收尾）
 *
 * 展示 BFF 纯函数聚合的核心表慢查询目录（patients/visits/prescriptions/
 * medical_records/notifications）与推荐索引清单（与 291-performance-indexes.sql 对齐）。
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF analyzeSlowQueries 输出对齐 */
interface SlowQueryRow {
  id: string;
  table: string;
  pattern: string;
  description: string;
  avgMs: number;
  callsPerDay: number;
  fixIndex: string;
  severity: 'high' | 'medium' | 'low';
}

/** 与 BFF recommendCoreIndexes 输出对齐 */
interface SuggestionRow {
  table: string;
  columns: string[];
  queryType: string;
  indexName: string;
  ddl: string;
  rationale: string;
  writeImpact: string;
  riskLevel: 'low' | 'medium';
}

interface SlowQueriesResponse {
  slowQueries: SlowQueryRow[];
  suggestions: SuggestionRow[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function severityTag(s: SlowQueryRow['severity']) {
  if (s === 'high') return <Tag color="red">高</Tag>;
  if (s === 'medium') return <Tag color="orange">中</Tag>;
  return <Tag color="green">低</Tag>;
}

export default function SlowQueriesPage() {
  const [data, setData] = useState<SlowQueriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/performance/slow-queries');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SlowQueriesResponse);
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

  const highCount = data?.slowQueries.filter((r) => r.severity === 'high').length ?? 0;

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
          数据库慢查询治理
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          核心表慢查询目录 · 索引建议与 291-performance-indexes.sql 对齐 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载数据库性能数据中…" />
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

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无慢查询数据。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 概览指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="慢查询模式" value={data.slowQueries.length} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="高优慢查询" value={highCount} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="推荐新索引" value={data.suggestions.length} suffix="条" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="通知表"
                    value="已覆盖"
                    valueStyle={{ fontSize: 20, color: VI.accent }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 慢查询目录 */}
            <Card title="核心表慢查询目录（按严重度 + 平均耗时排序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={data.slowQueries}
                locale={{ emptyText: '暂无慢查询记录' }}
                columns={[
                  { title: '表', dataIndex: 'table', width: 200 },
                  {
                    title: '查询模式',
                    dataIndex: 'pattern',
                    render: (v: string) => (
                      <Text code style={{ fontSize: 12 }}>
                        {v}
                      </Text>
                    ),
                  },
                  { title: '说明', dataIndex: 'description', ellipsis: true },
                  {
                    title: '平均耗时',
                    dataIndex: 'avgMs',
                    width: 110,
                    render: (v: number) => (
                      <Tag color={v >= 500 ? 'red' : v >= 200 ? 'orange' : 'green'}>{v} ms</Tag>
                    ),
                  },
                  { title: '日调用', dataIndex: 'callsPerDay', width: 100 },
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: SlowQueryRow['severity']) => severityTag(v),
                  },
                  {
                    title: '修复索引',
                    dataIndex: 'fixIndex',
                    width: 240,
                    render: (v: string) =>
                      v === 'none' ? <Tag color="default">无需新增</Tag> : <Text code>{v}</Text>,
                  },
                ]}
              />
            </Card>

            {/* 索引建议 */}
            <Card title="推荐索引清单（与 deploy/postgres/init/291-performance-indexes.sql 对齐）">
              <Table
                rowKey="indexName"
                pagination={false}
                dataSource={data.suggestions}
                locale={{ emptyText: '暂无索引建议' }}
                columns={[
                  { title: '索引名', dataIndex: 'indexName', width: 280, render: (v: string) => <Text code>{v}</Text> },
                  { title: '表', dataIndex: 'table', width: 200 },
                  {
                    title: '列序',
                    dataIndex: 'columns',
                    width: 220,
                    render: (v: string[]) => v.join(', '),
                  },
                  {
                    title: 'DDL',
                    dataIndex: 'ddl',
                    render: (v: string) => (
                      <Text code style={{ fontSize: 12, wordBreak: 'break-all' }}>
                        {v}
                      </Text>
                    ),
                  },
                  {
                    title: '风险',
                    dataIndex: 'riskLevel',
                    width: 90,
                    render: (v: 'low' | 'medium') =>
                      v === 'low' ? <Tag color="green">低</Tag> : <Tag color="orange">中</Tag>,
                  },
                ]}
              />
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                设计原则：索引不能加太多，影响写入性能——每张核心表只加 1 条窄列复合 btree；
                notifications 已在 263 建过未读 partial 索引，本页不再重复推荐。
              </Paragraph>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
