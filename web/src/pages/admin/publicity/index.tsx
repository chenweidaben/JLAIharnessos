/**
 * 健澜科技 jlmedaios - 宣传管理页（M194-D）
 *
 * 宣传阵地/新闻发布/品牌活动/健康科普/舆情/文化/效果/队伍。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  channels: { website: number; wechat: number; weibo: number; douyin: number; videoAccount: number };
  news: { published: number; mediaCoverage: number };
  brandActivities: { count: number };
  healthEducation: { articles: number; videos: number };
  sentiment: { level: string; positive: number; negative: number };
  culture: { events: number };
  effectiveness: number;
  team: { members: number };
  suggestions: string[];
}

export default function PublicityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/publicity/report');
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
        <Title level={3} style={{ color: VI.deep }}>宣传管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">宣传阵地 / 新闻发布 / 品牌活动 / 健康科普 / 舆情监测</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="官网访问量" value={data.channels.website} /></Card></Col>
              <Col span={6}><Card><Statistic title="公众号粉丝" value={data.channels.wechat} /></Card></Col>
              <Col span={6}>
                <Card title="舆情等级">
                  <Tag color={data.sentiment.level === 'positive' ? 'green' : data.sentiment.level === 'negative' ? 'red' : 'gray'}>
                    {data.sentiment.level === 'positive' ? '正面' : data.sentiment.level === 'negative' ? '负面' : '中性'}
                  </Tag>
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="宣传效果评分" value={data.effectiveness} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>宣传阵地粉丝量</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'wx', name: '微信公众号', count: data.channels.wechat },
                  { key: 'wb', name: '微博', count: data.channels.weibo },
                  { key: 'dy', name: '抖音', count: data.channels.douyin },
                  { key: 'sph', name: '视频号', count: data.channels.videoAccount },
                ]}
                columns={[
                  { title: '平台', dataIndex: 'name', key: 'name' },
                  { title: '粉丝数', dataIndex: 'count', key: 'count' },
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
