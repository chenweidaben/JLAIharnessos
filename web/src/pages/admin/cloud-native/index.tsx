/**
 * 健澜科技 jlmedaios - 云原生页（M197-A）
 *
 * 容器/K8s/服务网格/微服务/HPA/多环境/多云/mTLS。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  containers: { total: number; images: number; restarts: number };
  orchestration: { clusters: number; pods: number; nodes: number; cpuUtilization: number; memoryUtilization: number };
  serviceMesh: { istioEnabled: boolean; trafficManaged: number; circuitBreaker: number };
  microservices: { services: number };
  autoscaling: { hpa: number; vpa: number; keda: number };
  environments: { dev: number; staging: number; prod: number };
  multiCloud: { clouds: number };
  security: { mTLS: boolean; imageScanning: boolean };
  suggestions: string[];
}

export default function CloudNativePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/cloud-native/report');
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
        <Title level={3} style={{ color: VI.deep }}>云原生深化</Title>
        <Paragraph type="secondary">容器 / K8s / 服务网格 / 微服务 / HPA / 多环境 / 多云 / mTLS</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="容器总数" value={data.containers.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="K8s 集群" value={data.orchestration.clusters} /></Card></Col>
              <Col span={6}>
                <Card title="CPU 利用率">
                  <Progress percent={Math.round(data.orchestration.cpuUtilization * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="内存利用率">
                  <Progress percent={Math.round(data.orchestration.memoryUtilization * 100)} size="small" status="active" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>弹性伸缩</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'hpa', name: 'HPA', count: data.autoscaling.hpa },
                  { key: 'vpa', name: 'VPA', count: data.autoscaling.vpa },
                  { key: 'keda', name: 'KEDA', count: data.autoscaling.keda },
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
