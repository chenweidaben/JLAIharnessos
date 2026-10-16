/**
 * 健澜科技 jlmedaios - M200 发布页（M200-D）
 *
 * 版本概览/功能/代码/测试/性能/质量/回顾/展望。深海蓝 VI。
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
  version: string;
  releaseDate: string;
  modules: number;
  apis: number;
  pages: number;
  microservices: number;
  codeLines: number;
  files: number;
  commits: number;
  tags: number;
  unitTests: number;
  testCoverage: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughputQps: number;
  availability: number;
  defects: number;
  defectFixRate: number;
  retrospective: { milestones: number; keyAchievements: string[]; lessonsLearned: string[] };
  roadmap: string[];
}

export default function ReleaseM200Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/release/m200');
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
        <Title level={2} style={{ color: VI.deep, textAlign: 'center' }}>
          🎉 M200 里程碑发布
        </Title>
        <Paragraph type="secondary" style={{ textAlign: 'center' }}>
          {data?.version} · {data?.releaseDate}
        </Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="功能模块" value={data.modules} /></Card></Col>
              <Col span={6}><Card><Statistic title="API 端点" value={data.apis} /></Card></Col>
              <Col span={6}><Card><Statistic title="页面数" value={data.pages} /></Card></Col>
              <Col span={6}><Card><Statistic title="微服务" value={data.microservices} /></Card></Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="代码行数" value={data.codeLines} /></Card></Col>
              <Col span={6}><Card><Statistic title="单测数" value={data.unitTests} /></Card></Col>
              <Col span={6}><Card><Statistic title="测试覆盖率" value={`${(data.testCoverage * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="可用性" value={`${(data.availability * 100).toFixed(3)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>关键成就</Text>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.retrospective.keyAchievements}
                renderItem={(item) => <List.Item><Text>🏆 {item}</Text></List.Item>}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>未来路线图</Text>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.roadmap}
                renderItem={(item) => <List.Item><Tag color="blue">{item}</Tag></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
