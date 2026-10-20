/**
 * 健澜科技 jlmedaios - AI 中台页（M196-B）
 *
 * 模型注册/训练/推理/特征库/MLOps/CDSS/影像AI/治理。深海蓝 VI。
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
  modelRegistry: { registered: number; versions: number; deployed: number; monitored: number };
  training: { jobs: number; gpuHours: number };
  inference: { requests: number; avgLatencyMs: number };
  featureStore: { features: number; avgImportance: number; driftDetected: number };
  mlops: { cicdPipelines: number; abTests: number; rollbacks: number };
  aiApplications: { cdss: number; imagingAI: number; pathologyAI: number; asr: number; nlp: number };
  governance: { explainabilityRate: number; fairnessScore: number; compliance: string };
  suggestions: string[];
}

export default function AIPlatformPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/ai-platform/report');
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
        <Title level={3} style={{ color: VI.deep }}>AI 中台深化</Title>
        <Paragraph type="secondary">模型注册 / 训练 / 推理 / 特征库 / MLOps / CDSS / 影像AI / 治理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="注册模型" value={data.modelRegistry.registered} /></Card></Col>
              <Col span={6}><Card><Statistic title="部署模型" value={data.modelRegistry.deployed} /></Card></Col>
              <Col span={6}><Card><Statistic title="日推理请求" value={data.inference.requests} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均延迟(ms)" value={data.inference.avgLatencyMs} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 应用统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cdss', name: 'CDSS 辅助诊断', count: data.aiApplications.cdss },
                  { key: 'img', name: '影像 AI', count: data.aiApplications.imagingAI },
                  { key: 'path', name: '病理 AI', count: data.aiApplications.pathologyAI },
                  { key: 'asr', name: '语音识别', count: data.aiApplications.asr },
                  { key: 'nlp', name: 'NLP', count: data.aiApplications.nlp },
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
