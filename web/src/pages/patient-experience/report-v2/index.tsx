/**
 * 健澜科技 jlmedaios - 患者体验 V2 页（M218-A）
 *
 * 就医旅程/满意度/NPS/投诉/患者教育/共同决策/无障碍/便民。深海蓝 VI。
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
  journey: { steps: number; avgSatisfaction: number };
  satisfaction: { score: number };
  nps: { score: number };
  complaints: { total: number; resolved: number };
  education: { materials: number };
  engagement: { sharedDecision: number };
  accessibility: { ramp: boolean; signLanguage: boolean };
  concierge: { services: number };
  suggestions: string[];
}

export default function PatientExperienceV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/patient-experience/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>患者体验 V2</Title>
        <Paragraph type="secondary">端到端就医旅程 / 满意度·NPS / 投诉管理 / 患者教育 / 共同决策 / 无障碍</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.satisfaction.score}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={data.nps.score} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉" value={data.complaints.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="已解决" value={data.complaints.resolved} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>无障碍与便民</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ramp', name: '无障碍坡道', value: data.accessibility.ramp ? '已配置' : '未配置' },
                  { key: 'sign', name: '手语服务', value: data.accessibility.signLanguage ? '已配置' : '未配置' },
                  { key: 'concierge', name: '便民服务', value: `${data.concierge.services} 项` },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
