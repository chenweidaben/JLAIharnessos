/**
 * 健澜科技 jlmedaios - 性能压测页（M193-A）
 *
 * 并发用户/吞吐量/DB/缓存/资源 + 瓶颈识别 + 优化方案。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  scenarios: { users: number; qps: number; p95: number; errorRate: number }[];
  dbMetrics: { slowQueryRate: number; lockWaitRate: number; poolUsage: number };
  cacheMetrics: { hitRate: number };
  resourceMetrics: { cpu: number; memory: number };
  bottleneck: { bottleneck: string; severity: string };
  optimizationPlan: string[];
}

export default function PerformanceStressPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/performance/stress-test');
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
        <Title level={3} style={{ color: VI.deep }}>性能压测与优化</Title>
        <Paragraph type="secondary">100-5000 并发用户 / QPS / DB / 缓存 / 资源 / 瓶颈识别</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="当前瓶颈">
                  <Tag color={data.bottleneck.severity === 'high' ? 'red' : data.bottleneck.severity === 'medium' ? 'orange' : 'green'}>
                    {data.bottleneck.severity}
                  </Tag>
                  <Text style={{ marginLeft: 8 }}>{data.bottleneck.bottleneck}</Text>
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="峰值 QPS" value={6000} /></Card></Col>
              <Col span={6}>
                <Card title="缓存命中率">
                  <Progress percent={Math.round(data.cacheMetrics.hitRate * 100)} size="small" status={data.cacheMetrics.hitRate > 0.85 ? 'success' : 'exception'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="CPU 使用率">
                  <Progress percent={Math.round(data.resourceMetrics.cpu * 100)} size="small" status={data.resourceMetrics.cpu > 0.85 ? 'exception' : 'normal'} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>并发场景压测结果</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="users"
                size="small"
                pagination={false}
                dataSource={data.scenarios}
                columns={[
                  { title: '并发用户', dataIndex: 'users', key: 'users' },
                  { title: 'QPS', dataIndex: 'qps', key: 'qps' },
                  { title: 'P95 响应(ms)', dataIndex: 'p95', key: 'p95' },
                  { title: '错误率(%)', dataIndex: 'errorRate', key: 'errorRate', render: (v: number) => `${(v * 100).toFixed(2)}%` },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>优化方案</Text>}>
              <List
                size="small"
                dataSource={data.optimizationPlan}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
