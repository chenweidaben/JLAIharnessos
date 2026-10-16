/**
 * 健澜科技 jlmedaios - 学科建设 V2 页（M219-A）
 *
 * 国家/省级重点专科/专病中心/MDT/学科群/亚专科/学科评估/院院校合作。深海蓝 VI。
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
  national: { specialties: number };
  provincial: { specialties: number };
  diseaseCenters: { chestPain: number; stroke: number; trauma: number };
  mdt: { teams: number };
  interdisciplinary: { groups: number };
  subspecialty: { departments: number };
  assessment: { score: number };
  collaboration: { university: number };
  suggestions: string[];
}

export default function DisciplineV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/discipline/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>学科建设 V2</Title>
        <Paragraph type="secondary">国家·省级重点专科 / 胸痛·卒中·创伤专病中心 / MDT 多学科 / 学科群 / 亚专科</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国家级专科" value={data.national.specialties} /></Card></Col>
              <Col span={6}><Card><Statistic title="省级专科" value={data.provincial.specialties} /></Card></Col>
              <Col span={6}><Card><Statistic title="MDT 团队" value={data.mdt.teams} /></Card></Col>
              <Col span={6}><Card><Statistic title="亚专科" value={data.subspecialty.departments} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专病中心</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'chest', name: '胸痛中心', value: data.diseaseCenters.chestPain },
                  { key: 'stroke', name: '卒中中心', value: data.diseaseCenters.stroke },
                  { key: 'trauma', name: '创伤中心', value: data.diseaseCenters.trauma },
                ]}
                columns={[
                  { title: '中心', dataIndex: 'name', key: 'name' },
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
