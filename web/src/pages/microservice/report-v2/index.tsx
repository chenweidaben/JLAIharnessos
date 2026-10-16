/**
 * 健澜科技 jlmedaios - 微服务 V2 页（M216-B）
 *
 * DDD拆分/RESTful·GraphQL·gRPC/Saga·TCC/链路追踪/Redis缓存/灰度蓝绿。深海蓝 VI。
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

interface Result {
  timeRange: string;
  serviceSplit: { services: number; boundedContexts: number };
  api: { rest: number; graphql: number; grpc: number };
  communication: { sync: number; async: number };
  transaction: { saga: number; tcc: number };
  tracing: { jaeger: boolean };
  logging: { elk: boolean };
  cache: { redis: boolean };
  governance: { canary: number; blueGreen: number };
  suggestions: string[];
}

export default function MicroserviceV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/microservice/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>微服务架构 V2</Title>
        <Paragraph type="secondary">DDD 限界上下文 / RESTful·gRPC / Saga·TCC 分布式事务 / 链路追踪 / Redis 缓存</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="微服务数" value={data.serviceSplit.services} /></Card></Col>
              <Col span={6}><Card><Statistic title="REST API" value={data.api.rest} /></Card></Col>
              <Col span={6}><Card><Statistic title="gRPC 服务" value={data.api.grpc} /></Card></Col>
              <Col span={6}><Card><Statistic title="灰度发布" value={data.governance.canary} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>API 设计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'rest', name: 'RESTful', value: data.api.rest },
                  { key: 'graph', name: 'GraphQL', value: data.api.graphql },
                  { key: 'grpc', name: 'gRPC', value: data.api.grpc },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'value', key: 'value' },
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
