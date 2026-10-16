/**
 * 健澜科技 jlmedaios - HRP V2 页（M211-A）
 *
 * 物流/设备/人力/财务/预算/物资/合同/决策。深海蓝 VI。
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
  logistics: { stockValue: number };
  equipment: { assetValue: number };
  hr: { headcount: number };
  finance: { revenue: number; expense: number };
  budget: { executionRate: number };
  material: { consumed: number };
  contract: { total: number };
  decision: { assetTurnover: number };
  suggestions: string[];
}

export default function HRPV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/hrp/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医院资源规划 HRP V2</Title>
        <Paragraph type="secondary">物流 / 设备资产 / 人力资源 / 财务核算一体化 / 预算执行 / 合同管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="收入（万）" value={data.finance.revenue} /></Card></Col>
              <Col span={6}><Card><Statistic title="支出（万）" value={data.finance.expense} /></Card></Col>
              <Col span={6}><Card><Statistic title="预算执行率" value={`${(data.budget.executionRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="资产周转率" value={data.decision.assetTurnover} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>一体化模块</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'log', name: '物流管理', value: `${data.logistics.stockValue} 万` },
                  { key: 'eq', name: '设备资产', value: `${data.equipment.assetValue} 万` },
                  { key: 'hr', name: '人力资源', value: `${data.hr.headcount} 人` },
                  { key: 'mat', name: '物资消耗', value: `${data.material.consumed} 万` },
                ]}
                columns={[
                  { title: '模块', dataIndex: 'name', key: 'name' },
                  { title: '指标', dataIndex: 'value', key: 'value' },
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
