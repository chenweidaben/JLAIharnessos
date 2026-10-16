/**
 * 健澜科技 jlmedaios - 云原生 V2 页（M216-A）
 *
 * 容器化/K8s/HPA/Istio服务网格/Kafka/对象存储/RBAC。深海蓝 VI。
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
  container: { images: number; scanned: number };
  kubernetes: { clusters: number; nodes: number; hpa: number };
  serviceMesh: { istio: boolean };
  config: { center: boolean };
  registry: { service: boolean };
  messaging: { kafka: number };
  storage: { object: boolean };
  security: { rbac: boolean };
  suggestions: string[];
}

export default function CloudNativeV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/cloud-native/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>云原生平台 V2</Title>
        <Paragraph type="secondary">Docker 容器 / Kubernetes 集群 · HPA 自动伸缩 / Istio 服务网格 / Kafka 消息队列</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="镜像数" value={data.container.images} /></Card></Col>
              <Col span={6}><Card><Statistic title="K8s 集群" value={data.kubernetes.clusters} /></Card></Col>
              <Col span={6}><Card><Statistic title="节点数" value={data.kubernetes.nodes} /></Card></Col>
              <Col span={6}><Card><Statistic title="HPA 数" value={data.kubernetes.hpa} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>云原生组件</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'istio', name: 'Istio 服务网格', value: data.serviceMesh.istio ? '已启用' : '未启用' },
                  { key: 'cfg', name: '配置中心', value: data.config.center ? '已启用' : '未启用' },
                  { key: 'reg', name: '服务注册', value: data.registry.service ? '已启用' : '未启用' },
                  { key: 'rbac', name: 'RBAC 安全', value: data.security.rbac ? '已启用' : '未启用' },
                ]}
                columns={[
                  { title: '组件', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
