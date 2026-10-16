/**
 * 健澜科技 jlmedaios - 教学 V3 页（M207-C）
 *
 * 住培/研究生/继教/岗前/专科/教学活动/质量/OSCE。深海蓝 VI。
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
  residency: { enrolled: number; rotated: number; examined: number; graduated: number };
  graduate: { master: number; doctor: number };
  cme: { total: number; complianceRate: number };
  preJob: { trainees: number };
  specialtyCert: { nurses: number };
  activities: { lectures: number; rounds: number };
  quality: { score: number };
  resources: { osce: number; simulationCenter: boolean };
  suggestions: string[];
}

export default function EducationV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/education/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>教学培训 V2 深化</Title>
        <Paragraph type="secondary">住培招录/轮转/结业 / 研究生教育 / 继教学分 / OSCE·模拟中心</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="住培招录" value={data.residency.enrolled} /></Card></Col>
              <Col span={6}><Card><Statistic title="研究生" value={data.graduate.master + data.graduate.doctor} /></Card></Col>
              <Col span={6}><Card><Statistic title="继教达标率" value={`${(data.cme.complianceRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="教学质量分" value={data.quality.score} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>住培管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'en', name: '招录', value: data.residency.enrolled },
                  { key: 'rot', name: '轮转', value: data.residency.rotated },
                  { key: 'ex', name: '考核', value: data.residency.examined },
                  { key: 'grad', name: '结业', value: data.residency.graduated },
                ]}
                columns={[
                  { title: '环节', dataIndex: 'name', key: 'name' },
                  { title: '人数', dataIndex: 'value', key: 'value' },
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
