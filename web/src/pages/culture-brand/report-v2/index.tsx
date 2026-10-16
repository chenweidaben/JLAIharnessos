/**
 * 健澜科技 jlmedaios - 文化品牌 V2 页（M228-B）
 *
 * 院训愿景使命价值观/VI视觉·新媒体矩阵/品牌定位·传播·危机/健康科普·院史馆。深海蓝 VI。
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
  spirit: { motto: string; vision: string };
  vi: { manual: boolean; newMedia: number };
  brand: { positioning: string; crisis: number };
  propaganda: { articles: number };
  education: { health: number };
  activities: { held: number };
  experience: { satisfaction: number };
  museum: { visits: number };
  suggestions: string[];
}

export default function CultureBrandV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/culture-brand/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>文化品牌 V2</Title>
        <Paragraph type="secondary">院训·愿景·价值观 / VI 视觉·新媒体矩阵 / 品牌定位·传播·危机 / 健康科普·院史馆</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="新媒体平台" value={data.vi.newMedia} /></Card></Col>
              <Col span={6}><Card><Statistic title="宣传文章" value={data.propaganda.articles} /></Card></Col>
              <Col span={6}><Card><Statistic title="文化活动" value={data.activities.held} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.experience.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>品牌文化明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'motto', name: '院训', value: data.spirit.motto },
                  { key: 'vision', name: '愿景', value: data.spirit.vision },
                  { key: 'edu', name: '健康科普', value: data.education.health },
                  { key: 'museum', name: '院史馆参观', value: data.museum.visits },
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
