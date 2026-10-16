/**
 * 健澜科技 jlmedaios - 成本核算页（M189-B）
 *
 * 科室成本结构 + 病种成本 + 控制率 + 优化建议。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
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
  deptTotalCost: number;
  costStructure: { personnel: number; drugs: number; consumables: number; depreciation: number; overhead: number };
  budget: number;
  costControlRate: number;
  diseaseCosts: Array<{ disease: string; cost: number }>;
  suggestions: string[];
}

export default function CostAccountingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/cost-accounting/report');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>成本核算 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">科室成本结构 / 病种成本 / 成本控制率 / 优化建议</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card><Statistic title="科室总成本" value={data.deptTotalCost} prefix="¥" /></Card>
              </Col>
              <Col span={8}>
                <Card><Statistic title="预算" value={data.budget} prefix="¥" /></Card>
              </Col>
              <Col span={8}>
                <Card title="成本控制率">
                  <Progress percent={data.costControlRate} status={data.costControlRate <= 100 ? 'success' : 'exception'} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>成本结构分析</Text>} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={4}><Statistic title="人员" value={data.costStructure.personnel} /></Col>
                <Col span={4}><Statistic title="药品" value={data.costStructure.drugs} /></Col>
                <Col span={4}><Statistic title="耗材" value={data.costStructure.consumables} /></Col>
                <Col span={4}><Statistic title="折旧" value={data.costStructure.depreciation} /></Col>
                <Col span={4}><Statistic title="管理分摊" value={data.costStructure.overhead} /></Col>
              </Row>
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>病种成本</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="disease"
                size="small"
                pagination={false}
                dataSource={data.diseaseCosts}
                columns={[
                  { title: '病种', dataIndex: 'disease', key: 'disease' },
                  { title: '成本(元)', dataIndex: 'cost', key: 'cost' },
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
