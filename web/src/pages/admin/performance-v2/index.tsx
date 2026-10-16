/**
 * 健澜科技 jlmedaios - 生产性能优化页 V2（M187-A）
 *
 * 慢查询 Top10、缓存命中率、API 响应时间、连接池使用率、优化建议。
 * 深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface QueryMetric {
  query: string;
  executionCount: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
}

interface Result {
  timeRange: string;
  slowQueries: QueryMetric[];
  cacheHitRate: number;
  cachePenetrationRate: number;
  apiLatency: { p50: number; p95: number; p99: number };
  dbPoolUsage: number;
  suggestions: string[];
}

export default function PerformanceReportV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/performance/report');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>生产性能 · 优化看板</Title>
        <Paragraph type="secondary">慢查询 Top10 · 缓存命中率 · API 响应时间 · 连接池</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="缓存命中率" value={`${(data.cacheHitRate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="缓存穿透率" value={`${(data.cachePenetrationRate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="P50" value={data.apiLatency.p50} suffix="ms" /></Card></Col>
              <Col span={4}><Card><Statistic title="P95" value={data.apiLatency.p95} suffix="ms" /></Card></Col>
              <Col span={4}><Card><Statistic title="P99" value={data.apiLatency.p99} suffix="ms" /></Card></Col>
              <Col span={4}><Card><Statistic title="连接池使用率" value={`${(data.dbPoolUsage * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>慢查询 Top{data.slowQueries.length}</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="query"
                size="small"
                pagination={false}
                dataSource={data.slowQueries}
                columns={[
                  { title: 'SQL', dataIndex: 'query', key: 'query', ellipsis: true },
                  { title: '执行次数', dataIndex: 'executionCount', key: 'executionCount' },
                  { title: '平均耗时(ms)', dataIndex: 'avgLatencyMs', key: 'avgLatencyMs' },
                  { title: '总耗时(ms)', dataIndex: 'totalLatencyMs', key: 'totalLatencyMs' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>性能优化建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
