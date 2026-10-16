/**
 * 健澜科技 jlmedaios - 绩效 V2 页（M211-D）
 *
 * 院级/科级/个人/指标/周期/分配/反馈。深海蓝 VI。
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
  hospital: { score: number };
  dept: { count: number };
  individual: { count: number };
  indicators: { count: number };
  cycle: { monthly: boolean; quarterly: boolean; yearly: boolean };
  distribution: { workload: number; cost: number; risk: number; satisfaction: number };
  feedback: { completed: number };
  suggestions: string[];
}

export default function PerformanceV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/performance/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>绩效考核与分配 V2</Title>
        <Paragraph type="secondary">院级 / 科级 / 个人三级考核 / 月·季·年周期 / 工作量·成本·风险·满意度分配</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="院级得分" value={data.hospital.score} /></Card></Col>
              <Col span={6}><Card><Statistic title="科室数" value={data.dept.count} /></Card></Col>
              <Col span={6}><Card><Statistic title="考核人数" value={data.individual.count} /></Card></Col>
              <Col span={6}><Card><Statistic title="考核指标" value={data.indicators.count} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>分配权重</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'w', name: '工作量', value: `${(data.distribution.workload * 100).toFixed(0)}%` },
                  { key: 'c', name: '成本控制', value: `${(data.distribution.cost * 100).toFixed(0)}%` },
                  { key: 'r', name: '风险难度', value: `${(data.distribution.risk * 100).toFixed(0)}%` },
                  { key: 's', name: '满意度', value: `${(data.distribution.satisfaction * 100).toFixed(0)}%` },
                ]}
                columns={[
                  { title: '维度', dataIndex: 'name', key: 'name' },
                  { title: '权重', dataIndex: 'value', key: 'value' },
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
