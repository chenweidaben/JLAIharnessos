/**
 * 健澜科技 jlmedaios - 大模型集成页（M201-A）
 *
 * 多模型/Prompt工程/RAG/Function Calling/多轮/微调/成本/治理。深海蓝 VI。
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
  models: { gpt: boolean; claude: boolean; qwen: boolean; ernie: boolean; total: number };
  prompts: { templates: number; versions: number; abTests: number };
  rag: { knowledgeBases: number; vectorIndex: number; avgRetrievalMs: number };
  functionCalling: { tools: number; successRate: number };
  multiTurn: { avgTurns: number };
  fineTuning: { models: number };
  cost: { monthlyUSD: number; costPerQuery: number };
  governance: { hallucinationRate: number; biasChecks: number; complianceRate: number };
  suggestions: string[];
}

export default function LLMIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/llm/report');
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
        <Title level={3} style={{ color: VI.deep }}>大模型集成深化</Title>
        <Paragraph type="secondary">多模型管理 / Prompt 工程 / RAG 检索增强 / Function Calling / 多轮对话 / 推理成本 / 模型治理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="接入模型数" value={data.models.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="知识库数" value={data.rag.knowledgeBases} /></Card></Col>
              <Col span={6}><Card><Statistic title="Function Calling 工具" value={data.functionCalling.tools} /></Card></Col>
              <Col span={6}><Card><Statistic title="月推理成本(USD)" value={data.cost.monthlyUSD} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>模型治理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'hal', name: '幻觉率', value: `${(data.governance.hallucinationRate * 100).toFixed(1)}%` },
                  { key: 'bia', name: '偏见检查', value: data.governance.biasChecks },
                  { key: 'com', name: '合规率', value: `${(data.governance.complianceRate * 100).toFixed(1)}%` },
                  { key: 'avg', name: '平均多轮数', value: data.multiTurn.avgTurns },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
