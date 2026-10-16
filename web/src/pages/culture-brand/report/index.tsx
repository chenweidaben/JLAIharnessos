/**
 * 健澜科技 jlmedaios - 文化品牌页（M213-D）
 *
 * 院训愿景使命/医院故事/品牌VI/患者体验/员工文化/公益/对外交流/文化阵地。深海蓝 VI。
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
  spirit: { motto: string; vision: string; mission: string };
  stories: { published: number };
  brand: { vi: boolean; logo: string };
  patientExperience: { score: number };
  employeeCulture: { activities: number };
  charity: { events: number };
  exchange: { visits: number };
  cultureExhibition: { museum: boolean };
  suggestions: string[];
}

export default function CultureBrandPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/culture-brand/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院文化与品牌</Title>
        <Paragraph type="secondary">院训/愿景/使命 / 医院故事 / 品牌 VI / 患者体验 / 公益活动 / 对外交流</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医院故事" value={data.stories.published} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者体验分" value={data.patientExperience.score} /></Card></Col>
              <Col span={6}><Card><Statistic title="公益活动" value={data.charity.events} /></Card></Col>
              <Col span={6}><Card><Statistic title="对外交流" value={data.exchange.visits} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医院精神</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'motto', name: '院训', value: data.spirit.motto },
                  { key: 'vision', name: '愿景', value: data.spirit.vision },
                  { key: 'mission', name: '使命', value: data.spirit.mission },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '内容', dataIndex: 'value', key: 'value' },
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
