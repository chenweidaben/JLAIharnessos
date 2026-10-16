/**
 * 健澜科技 jlmedaios - 运营 V3 页（M207-A）
 *
 * 门诊/住院/手术/医技/成本/效益/预测/看板。深海蓝 VI。
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
  outpatient: { visits: number; avgRevenue: number };
  inpatient: { admissions: number; avgStayDays: number; occupancyRate: number };
  surgery: { cases: number; orUtilization: number };
  tech: { exams: number; revenue: number };
  cost: { total: number; perVisit: number };
  efficiency: { costRatio: number };
  forecast: { nextMonthVisits: number };
  dashboard: { realtime: boolean };
  suggestions: string[];
}

export default function OperationsV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/operations/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>运营分析 V2 深化</Title>
        <Paragraph type="secondary">门诊量 / 床位使用率 / 手术间利用率 / 成本效益 / 运营预测 / 院长看板</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊量" value={data.outpatient.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="床位使用率" value={`${(data.inpatient.occupancyRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="手术间利用率" value={`${(data.surgery.orUtilization * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="次均成本" value={data.cost.perVisit} prefix="¥" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营指标</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'op', name: '门诊量', value: data.outpatient.visits },
                  { key: 'ip', name: '住院人次', value: data.inpatient.admissions },
                  { key: 'surg', name: '手术台数', value: data.surgery.cases },
                  { key: 'tech', name: '检查人次', value: data.tech.exams },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
