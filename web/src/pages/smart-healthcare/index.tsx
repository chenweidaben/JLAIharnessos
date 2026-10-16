/**
 * 健澜科技 jlmedaios - 智慧医疗页（M195-D）
 *
 * 智能导诊/预问诊/分诊/诊断/治疗/用药/随访/健康风险。深海蓝 VI。
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
  triage: { intelligent: number; accuracy: number };
  preVisit: { consultations: number };
  diagnosis: { assisted: number; accuracy: number };
  treatment: { suggestions: number };
  medication: { reviews: number; interceptRate: number };
  followup: { intelligent: number };
  healthRisk: { assessed: number; highRisk: number };
  suggestions: string[];
}

export default function SmartHealthcarePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/smart-healthcare/report');
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
        <Title level={3} style={{ color: VI.deep }}>智慧医疗深化</Title>
        <Paragraph type="secondary">智能导诊 / 预问诊 / 分诊 / AI 诊断 / 治疗 / 用药 / 随访 / 健康风险</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="智能导诊" value={data.triage.intelligent} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 辅助诊断" value={data.diagnosis.assisted} /></Card></Col>
              <Col span={6}>
                <Card title="诊断准确率">
                  <Progress percent={Math.round(data.diagnosis.accuracy * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="高风险人数" value={data.healthRisk.highRisk} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 应用统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pv', name: '预问诊', count: data.preVisit.consultations },
                  { key: 'tr', name: '治疗建议', count: data.treatment.suggestions },
                  { key: 'med', name: '智能审方', count: data.medication.reviews },
                  { key: 'fu', name: '智能随访', count: data.followup.intelligent },
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
