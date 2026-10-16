/**
 * 健澜科技 jlmedaios - 财务核算 V2 页（M226-C）
 *
 * 收入支出核算/科室·项目·病种·DRG成本分摊/预算执行·资产负债/财务报表·比率分析。深海蓝 VI。
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
  revenue: { total: number };
  expense: { total: number };
  cost: { allocated: number; drg: number };
  budget: { executed: number; planned: number };
  asset: { total: number };
  liability: { total: number };
  statement: { reports: number };
  analysis: { ratio: number };
  suggestions: string[];
}

export default function FinanceMgmtV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/finance/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>财务核算 V2</Title>
        <Paragraph type="secondary">收入支出核算 / 科室·项目·病种·DRG 成本分摊 / 预算执行·资产负债 / 财务报表·比率分析</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总收入(亿元)" value={Math.round(data.revenue.total / 100000000 * 100) / 100} /></Card></Col>
              <Col span={6}><Card><Statistic title="总支出(亿元)" value={Math.round(data.expense.total / 100000000 * 100) / 100} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 成本(亿元)" value={Math.round(data.cost.drg / 100000000 * 100) / 100} /></Card></Col>
              <Col span={6}><Card><Statistic title="资产负债率" value={`${data.analysis.ratio}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>财务运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'budget', name: '预算执行率', value: `${Math.round((data.budget.executed / data.budget.planned) * 100)}%` },
                  { key: 'asset', name: '总资产(亿元)', value: Math.round(data.asset.total / 100000000 * 100) / 100 },
                  { key: 'liability', name: '总负债(亿元)', value: Math.round(data.liability.total / 100000000 * 100) / 100 },
                  { key: 'reports', name: '财务报表', value: data.statement.reports },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
