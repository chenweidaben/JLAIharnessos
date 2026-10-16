/**
 * 健澜科技 jlmedaios - 用户体验页（M199-A）
 *
 * 设计系统/用户旅程/用户研究/交互/视觉/响应式/性能。深海蓝 VI。
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
  design: { system: boolean; components: number; reviews: number };
  journey: { patient: number; clinician: number; admin: number };
  research: { interviews: number; usabilityTests: number; satisfaction: number; nps: number };
  interaction: { consistency: number };
  visual: { darkMode: boolean };
  responsive: { mobileCoverage: number };
  performance: { firstScreenMs: number; interactionMs: number };
  suggestions: string[];
}

export default function UserExperiencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/user-experience/report');
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
        <Title level={3} style={{ color: VI.deep }}>用户体验深化</Title>
        <Paragraph type="secondary">设计系统 / 用户旅程 / 用户研究 / 交互 / 视觉 / 响应式 / 性能体验</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="患者满意度" value={data.research.satisfaction} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={data.research.nps} /></Card></Col>
              <Col span={6}><Card><Statistic title="首屏时间(ms)" value={data.performance.firstScreenMs} /></Card></Col>
              <Col span={6}>
                <Card title="移动端覆盖">
                  <Progress percent={Math.round(data.responsive.mobileCoverage * 100)} size="small" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>用户旅程</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pat', name: '患者就医旅程', count: data.journey.patient },
                  { key: 'cli', name: '医护工作旅程', count: data.journey.clinician },
                  { key: 'adm', name: '管理决策旅程', count: data.journey.admin },
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
