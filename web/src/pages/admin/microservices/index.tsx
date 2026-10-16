/**
 * 健澜科技 jlmedaios - 微服务页（M197-B）
 *
 * 服务清单/通信/治理/发现/配置/网关/追踪/监控。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  catalog: { total: number; grpc: number; rest: number; async: number };
  governance: { rateLimiting: number; circuitBreaking: number; retries: number; timeouts: number };
  discovery: { registered: number; healthy: number };
  config: { configs: number; environments: number };
  gateway: { routes: number; dailyRequests: number };
  tracing: { traces: number; slowCalls: number; topDependencies: string[] };
  monitoring: { avgQPS: number; avgP99: number; avgErrorRate: number };
  suggestions: string[];
}

export default function MicroservicesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/microservices/report');
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
        <Title level={3} style={{ color: VI.deep }}>微服务架构深化</Title>
        <Paragraph type="secondary">服务清单 / 通信 / 治理 / 发现 / 配置 / API 网关 / 链路追踪 / 监控</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="服务总数" value={data.catalog.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="健康服务" value={data.discovery.healthy} /></Card></Col>
              <Col span={6}><Card><Statistic title="日网关请求" value={data.gateway.dailyRequests} /></Card></Col>
              <Col span={6}><Card><Statistic title="P99 延迟(ms)" value={data.monitoring.avgP99} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>服务治理规则</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'rl', name: '限流规则', count: data.governance.rateLimiting },
                  { key: 'cb', name: '熔断规则', count: data.governance.circuitBreaking },
                  { key: 'rt', name: '重试规则', count: data.governance.retries },
                  { key: 'to', name: '超时规则', count: data.governance.timeouts },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
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
