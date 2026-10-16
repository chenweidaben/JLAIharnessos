/**
 * 健澜科技 jlmedaios - 公共卫生管理页（M192-C）
 *
 * 传染病/慢病控制/预防接种/妇幼/老年/健康教育。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  infectiousDiseases: { classA: number; classB: number; classC: number; timeliness: number };
  chronicControlRate: number;
  immunization: { firstClassRate: number; secondClassRate: number; adverseReaction: number };
  maternalChild: { prenatalCheckRate: number; postnatalVisitRate: number };
  elderlyHealth: { managed: number; assessmentRate: number };
  healthEducation: { sessions: number; attendees: number };
  emergency: { events: number; responseTime: number };
  suggestions: string[];
}

export default function PublicHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/public-health/report');
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
        <Title level={3} style={{ color: VI.deep }}>公共卫生管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">传染病 / 慢病控制 / 预防接种 / 妇幼 / 老年 / 健康教育</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="乙类传染病" value={data.infectiousDiseases.classB} /></Card></Col>
              <Col span={4}><Card><Statistic title="丙类传染病" value={data.infectiousDiseases.classC} /></Card></Col>
              <Col span={4}><Card><Statistic title="慢病控制率" value={`${data.chronicControlRate}%`} /></Card></Col>
              <Col span={4}>
                <Card title="一类疫苗接种率">
                  <Progress percent={Math.round(data.immunization.firstClassRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={4}><Card><Statistic title="管理老人数" value={data.elderlyHealth.managed} /></Card></Col>
              <Col span={4}><Card><Statistic title="健康教育场次" value={data.healthEducation.sessions} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>传染病报告</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'A', name: '甲类', count: data.infectiousDiseases.classA },
                  { key: 'B', name: '乙类', count: data.infectiousDiseases.classB },
                  { key: 'C', name: '丙类', count: data.infectiousDiseases.classC },
                ]}
                columns={[
                  { title: '类别', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'count', key: 'count' },
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
