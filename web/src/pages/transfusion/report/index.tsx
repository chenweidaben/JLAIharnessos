/**
 * 健澜科技 jlmedaios - 输血管理页（M224-C）
 *
 * 输血指征·交叉配血/血液入库冷链/发放核对/输血反应（溶血·TRALI·TACO）/自体输血·不规则抗体。深海蓝 VI。
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
  request: { orders: number; crossmatch: number };
  inventory: { units: number; coldChain: boolean };
  delivery: { verified: number };
  execution: { transfused: number };
  reaction: { total: number; hemolysis: number; trali: number; taco: number };
  autologous: { units: number };
  management: { antibody: number };
  safety: { audit: boolean };
  suggestions: string[];
}

export default function TransfusionReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/transfusion/report');
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
        <Title level={3} style={{ color: VI.deep }}>输血管理</Title>
        <Paragraph type="secondary">输血指征·交叉配血 / 血液入库冷链·发放核对 / 输血反应（溶血·TRALI·TACO）/ 自体输血·不规则抗体</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="输血申请" value={data.request.orders} /></Card></Col>
              <Col span={6}><Card><Statistic title="库存血制" value={data.inventory.units} /></Card></Col>
              <Col span={6}><Card><Statistic title="已输注" value={data.execution.transfused} /></Card></Col>
              <Col span={6}><Card><Statistic title="输血反应" value={data.reaction.total} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>输血反应与安全</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'hem', name: '溶血反应', value: data.reaction.hemolysis },
                  { key: 'trali', name: 'TRALI', value: data.reaction.trali },
                  { key: 'taco', name: 'TACO', value: data.reaction.taco },
                  { key: 'auto', name: '自体输血', value: data.autologous.units },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
