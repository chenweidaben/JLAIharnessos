/**
 * 健澜科技 jlmedaios - 财务 V2 页（M211-B）
 *
 * 收入/支出/科室成本/项目成本/DRG成本/预算/物价/报表。深海蓝 VI。
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
  revenue: { total: number; outpatient: number; inpatient: number };
  expense: { total: number };
  deptCost: { avg: number };
  projectCost: { avg: number };
  drgCost: { avgCost: number; avgPayment: number };
  budget: { executionRate: number };
  pricing: { items: number };
  statements: { issued: number };
  suggestions: string[];
}

export default function FinanceV2Page() {
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
        <Title level={3} style={{ color: VI.deep }}>财务核算与成本管理 V2</Title>
        <Paragraph type="secondary">收入支出 / 科室成本 / 项目成本 / DRG-DIP 盈亏 / 预算执行 / 物价管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总收入（万）" value={data.revenue.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="总支出（万）" value={data.expense.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 均成本" value={data.drgCost.avgCost} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 均支付" value={data.drgCost.avgPayment} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>收入结构</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'out', name: '门诊收入', value: `${data.revenue.outpatient} 万` },
                  { key: 'in', name: '住院收入', value: `${data.revenue.inpatient} 万` },
                  { key: 'tot', name: '合计', value: `${data.revenue.total} 万` },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '金额', dataIndex: 'value', key: 'value' },
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
