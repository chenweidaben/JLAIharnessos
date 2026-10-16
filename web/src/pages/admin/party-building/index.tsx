/**
 * 健澜科技 jlmedaios - 党建管理页（M194-A）
 *
 * 党组织/党员/三会一课/主题党日/教育/活动/廉政。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  organization: { committee: number; branch: number; memberRate: number };
  memberDevelopment: { newMembers: number; applicants: number };
  life: { threeMeetings: number; themePartyDay: number };
  education: { hours: number; xuexiQiangguoRate: number };
  activities: { count: number; participants: number };
  integrity: { trainingCount: number };
  score: number;
  suggestions: string[];
}

export default function PartyBuildingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/party-building/report');
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
        <Title level={3} style={{ color: VI.deep }}>党建管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">党组织 / 党员 / 三会一课 / 主题党日 / 教育 / 活动 / 廉政</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="党委/党总支" value={data.organization.committee} /></Card></Col>
              <Col span={6}><Card><Statistic title="党支部" value={data.organization.branch} /></Card></Col>
              <Col span={6}>
                <Card title="党员占比">
                  <Progress percent={Math.round(data.organization.memberRate * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="党建评分" value={data.score} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>组织生活</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'tm', name: '三会一课', count: data.life.threeMeetings },
                  { key: 'tr', name: '主题党日', count: data.life.themePartyDay },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '次数', dataIndex: 'count', key: 'count' },
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
