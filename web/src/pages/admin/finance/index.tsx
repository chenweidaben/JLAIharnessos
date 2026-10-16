/**
 * 健澜科技 jlmedaios - 财务收费管理页（M192-A）
 *
 * 门诊/住院收费 + 医保结算 + 收入结构 + 欠费/退费 + 趋势。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  revenueStructure: { total: number; outpatientRatio: number; inpatientRatio: number; drugRatio: number; materialRatio: number };
  insuranceSettlement: { pooling: number; personal: number; selfPay: number };
  arrears: { total: number; overdue: number };
  refunds: { count: number; amount: number; rate: number };
  trend: { mom: number; yoy: number; forecast: number };
  suggestions: string[];
}

export default function FinanceBillingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/finance/report');
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
        <Title level={3} style={{ color: VI.deep }}>财务收费管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">门诊/住院收费 / 医保结算 / 收入结构 / 欠费退费 / 趋势</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="总收入" value={data.revenueStructure.total} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="门诊占比" value={`${data.revenueStructure.outpatientRatio}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="住院占比" value={`${data.revenueStructure.inpatientRatio}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="药占比" value={`${data.revenueStructure.drugRatio}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="欠费总额" value={data.arrears.total} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="退费金额" value={data.refunds.amount} prefix="¥" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医保结算</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pooling', name: '统筹支付', amount: data.insuranceSettlement.pooling },
                  { key: 'personal', name: '个账支付', amount: data.insuranceSettlement.personal },
                  { key: 'self', name: '个人自付', amount: data.insuranceSettlement.selfPay },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '金额(元)', dataIndex: 'amount', key: 'amount' },
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
