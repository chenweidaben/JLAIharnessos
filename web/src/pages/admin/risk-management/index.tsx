/**
 * 健澜科技 jlmedaios - 风险管理页（M198-D）
 *
 * 识别/评估/应对/监控/应急/BIA-BCP-DRP/文化。深海蓝 VI。
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
  identification: { strategic: number; operational: number; financial: number; legal: number; safety: number };
  assessment: { low: number; medium: number; high: number; critical: number };
  response: { avoid: number; reduce: number; transfer: number; accept: number };
  monitoring: { monitored: number; alerts: number };
  emergency: { plans: number; drills: number; incidents: number };
  continuity: { bia: number; bcp: number; drp: number };
  report: { issued: number };
  culture: { training: number; awarenessRate: number };
  suggestions: string[];
}

export default function RiskManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/risk-management/report');
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
        <Title level={3} style={{ color: VI.deep }}>风险管理深化</Title>
        <Paragraph type="secondary">风险识别 / 评估矩阵 / 应对 / 监控 / 应急 / BIA-BCP-DRP / 风险文化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="严重风险" value={data.assessment.critical} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="高风险" value={data.assessment.high} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="应急预案" value={data.emergency.plans} /></Card></Col>
              <Col span={6}><Card><Statistic title="应急演练" value={data.emergency.drills} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>风险等级分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'low', name: '低风险', count: data.assessment.low, color: 'green' },
                  { key: 'med', name: '中风险', count: data.assessment.medium, color: 'blue' },
                  { key: 'high', name: '高风险', count: data.assessment.high, color: 'orange' },
                  { key: 'crit', name: '严重风险', count: data.assessment.critical, color: 'red' },
                ]}
                columns={[
                  { title: '等级', dataIndex: 'name', key: 'name', render: (n: string, r: { color: string }) => <Tag color={r.color}>{n}</Tag> },
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
