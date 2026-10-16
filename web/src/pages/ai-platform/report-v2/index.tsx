/**
 * 健澜科技 jlmedaios - AI 中台 V2 页（M215-B）
 *
 * 模型注册/训练平台/推理服务/特征平台/知识中台/AI治理。深海蓝 VI。
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
  modelRegistry: { models: number; versions: number; deployed: number };
  training: { jobs: number; datasets: number };
  inference: { online: number; batch: number; sla: number };
  featureStore: { features: number };
  knowledgeHub: { knowledge: number };
  application: { apps: number };
  governance: { biasAudit: number; explainable: boolean };
  platform: { mlflow: boolean };
  suggestions: string[];
}

export default function AIPlatformV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/ai-platform/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>AI 中台 V2</Title>
        <Paragraph type="secondary">模型注册 / 训练平台 / 在线·批量推理 / 特征平台 / 知识中台 / AI 治理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="模型数" value={data.modelRegistry.models} /></Card></Col>
              <Col span={6}><Card><Statistic title="已部署" value={data.modelRegistry.deployed} /></Card></Col>
              <Col span={6}><Card><Statistic title="特征数" value={data.featureStore.features} /></Card></Col>
              <Col span={6}><Card><Statistic title="推理 SLA" value={`${data.inference.sla}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>模型管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'm', name: '模型数', value: data.modelRegistry.models },
                  { key: 'v', name: '版本数', value: data.modelRegistry.versions },
                  { key: 'd', name: '已部署', value: data.modelRegistry.deployed },
                  { key: 'j', name: '训练任务', value: data.training.jobs },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
