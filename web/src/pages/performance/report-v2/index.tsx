/**
 * 健澜科技 jlmedaios - 绩效管理 V2 页（M226-D）
 *
 * 院/科/个人三级考核/工作量·成本·风险·满意度绩效/月季年周期·绩效面谈/多劳多得优劳优得。深海蓝 VI。
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
  hospital: { depts: number };
  dept: { evaluated: number };
  individual: { total: number };
  distribution: { bonus: number };
  cycle: { monthly: number; quarterly: number; yearly: number };
  feedback: { interviews: number };
  analysis: { merit: boolean };
  culture: { satisfaction: number };
  suggestions: string[];
}

export default function PerformanceMgmtV2Page() {
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
        <Title level={3} style={{ color: VI.deep }}>绩效管理 V2</Title>
        <Paragraph type="secondary">院/科/个人三级考核 / 工作量·成本·风险·满意度 / 月季年周期·绩效面谈 / 多劳多得优劳优得</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="考核科室" value={data.hospital.depts} /></Card></Col>
              <Col span={6}><Card><Statistic title="考核个人" value={data.individual.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="绩效奖金(万元)" value={Math.round(data.distribution.bonus / 10000)} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.culture.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绩效周期与反馈</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'monthly', name: '月度考核', value: data.cycle.monthly },
                  { key: 'quarterly', name: '季度考核', value: data.cycle.quarterly },
                  { key: 'yearly', name: '年度考核', value: data.cycle.yearly },
                  { key: 'interview', name: '绩效面谈', value: data.feedback.interviews },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '次数', dataIndex: 'value', key: 'value' },
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
