/**
 * 健澜科技 jlmedaios - 医保 V3 页（M205-C）
 *
 * DRG/DIP分组/费用结构/结算审核/考核。深海蓝 VI。
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
  drg: { groupingRate: number; lowAdmission: number; upCoding: number; mainDxSelection: number };
  dip: { diseaseScore: number; pointValue: number; totalBudget: number; surplusRetention: number };
  cost: { avgPerVisit: number; drugRatio: number; materialRatio: number; selfPayRatio: number };
  settlement: { settled: number; pending: number };
  audit: { preAudit: number; duringAudit: number; postAudit: number };
  assessment: { creditRating: string };
  suggestions: string[];
}

export default function InsuranceV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/insurance/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>医保 DRG/DIP V2 深化</Title>
        <Paragraph type="secondary">DRG 入组率 / DIP 病种分值 / 次均费用 / 药占比·耗占比 / 信用评级</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="DRG 入组率" value={`${(data.drg.groupingRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="次均费用" value={data.cost.avgPerVisit} prefix="¥" /></Card></Col>
              <Col span={6}><Card><Statistic title="药占比" value={`${(data.cost.drugRatio * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="信用评级" value={data.assessment.creditRating} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>DIP 预算</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'score', name: '病种总分值', value: data.dip.diseaseScore },
                  { key: 'point', name: '点值（元）', value: data.dip.pointValue },
                  { key: 'budget', name: '总额预算（元）', value: data.dip.totalBudget },
                  { key: 'surplus', name: '结余留用（元）', value: data.dip.surplusRetention },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
