/**
 * 健澜科技 jlmedaios - 运营数据分析页（M189-D）
 *
 * 门诊/住院/手术运营 + 收支结构 + 趋势分析。深海蓝 VI。
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
  timeRange: string;
  outpatient: { visits: number[]; appointmentRate: number; waitingTime: number; satisfaction: number };
  inpatient: { discharges: number; averageLOS: number; bedOccupancy: number; turnover: number };
  surgery: { volume: number; level34Ratio: number; successRate: number; avgDuration: number };
  revenueStructure: { medical: number; drug: number; exam: number; other: number };
  balance: number;
  outpatientTrend: { avgVisits: number; trend: string };
  inpatientTrend: { bedOccupancy: number; turnover: number; los: number };
  suggestions: string[];
}

export default class OperationsAnalyticsPage extends React.Component {
  render() {
    return <OperationsAnalyticsInner />;
  }
}

function OperationsAnalyticsInner() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/operations-analytics/report');
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
        <Title level={3} style={{ color: VI.deep }}>运营数据分析 · 深化看板</Title>
        <Paragraph type="secondary">门诊 / 住院 / 手术运营 + 收支结构 + 趋势分析</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="门诊量" value={data.outpatientTrend.avgVisits} /></Card></Col>
              <Col span={4}><Card><Statistic title="住院出院" value={data.inpatient.discharges} /></Card></Col>
              <Col span={4}><Card><Statistic title="手术量" value={data.surgery.volume} /></Card></Col>
              <Col span={4}><Card><Statistic title="床位使用率" value={`${data.inpatientTrend.bedOccupancy}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="平均住院日" value={data.inpatientTrend.los} suffix="天" /></Card></Col>
              <Col span={4}><Card><Statistic title="收支结余" value={data.balance} prefix="¥" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营趋势</Text>} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>门诊趋势：</Text>
                  <Tag color={data.outpatientTrend.trend === 'up' ? 'green' : data.outpatientTrend.trend === 'down' ? 'red' : 'default'}>
                    {data.outpatientTrend.trend === 'up' ? '上升' : data.outpatientTrend.trend === 'down' ? '下降' : '平稳'}
                  </Tag>
                </Col>
                <Col span={8}>
                  <Text strong>床位使用率：</Text>
                  <Text>{data.inpatientTrend.bedOccupancy}%</Text>
                </Col>
                <Col span={8}>
                  <Text strong>床位周转：</Text>
                  <Text>{data.inpatientTrend.turnover} 次/月</Text>
                </Col>
              </Row>
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>收入结构</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'medical', name: '医疗收入', ratio: `${(data.revenueStructure.medical * 100).toFixed(0)}%` },
                  { key: 'drug', name: '药品收入', ratio: `${(data.revenueStructure.drug * 100).toFixed(0)}%` },
                  { key: 'exam', name: '检查收入', ratio: `${(data.revenueStructure.exam * 100).toFixed(0)}%` },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '占比', dataIndex: 'ratio', key: 'ratio' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>优化建议</Text>}>
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
