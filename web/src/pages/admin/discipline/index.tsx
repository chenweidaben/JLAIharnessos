/**
 * 健澜科技 jlmedaios - 纪检监察页（M194-B）
 *
 * 纪检组织/廉政教育/风险点/监督/信访/执纪/作风。深海蓝 VI。
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
  organization: { committee: number; members: number };
  integrityEducation: { sessions: number; participants: number };
  riskPoints: { total: number; high: number; medium: number; low: number };
  supervision: { inspections: number; problems: number };
  complaints: { received: number; handled: number };
  disciplineActions: { total: number };
  styleImprovement: { eightRegulations: number; siFengRectification: number };
  suggestions: string[];
}

export default function DisciplinePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/discipline/report');
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
        <Title level={3} style={{ color: VI.deep }}>纪检监察 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">廉政教育 / 风险点 / 监督检查 / 信访举报 / 执纪问责 / 作风建设</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="纪检委员" value={data.organization.members} /></Card></Col>
              <Col span={6}><Card><Statistic title="廉政风险点" value={data.riskPoints.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="监督检查次数" value={data.supervision.inspections} /></Card></Col>
              <Col span={6}><Card><Statistic title="信访举报" value={data.complaints.received} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>廉政风险分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'high', level: '高风险', count: data.riskPoints.high },
                  { key: 'medium', level: '中风险', count: data.riskPoints.medium },
                  { key: 'low', level: '低风险', count: data.riskPoints.low },
                ]}
                columns={[
                  { title: '等级', dataIndex: 'level', key: 'level', render: (v: string) => <Tag color={v === '高风险' ? 'red' : v === '中风险' ? 'orange' : 'green'}>{v}</Tag> },
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
