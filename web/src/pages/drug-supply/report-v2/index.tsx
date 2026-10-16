/**
 * 健澜科技 jlmedaios - 药品供应链 V2 页（M209-D）
 *
 * 采购/库存/特殊药品/SPD高值耗材/ADR召回/供应商协同。深海蓝 VI。
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
  procurement: { sunshine: number; tender: number };
  inventory: { total: number; nearExpiry: number; slowMoving: number };
  special: { narcotic: number; coldChain: number; radioactive: number };
  spd: { highValue: number; lowValue: number };
  adr: { recall: number };
  collaboration: { supplierPortal: number };
  suggestions: string[];
}

export default function DrugSupplyV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/drug-supply/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>药品供应链与耗材管理 V2 深化</Title>
        <Paragraph type="secondary">阳光采购 / 效期预警 / 麻精·冷链·放射特殊药品 / SPD 高值耗材追溯 / ADR 召回</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="采购总额" value={data.procurement.sunshine} /></Card></Col>
              <Col span={6}><Card><Statistic title="近效期" value={data.inventory.nearExpiry} /></Card></Col>
              <Col span={6}><Card><Statistic title="高值耗材" value={data.spd.highValue} /></Card></Col>
              <Col span={6}><Card><Statistic title="召回事件" value={data.adr.recall} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>特殊药品</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'nar', name: '麻精药品', value: data.special.narcotic },
                  { key: 'cold', name: '冷链药品', value: data.special.coldChain },
                  { key: 'rad', name: '放射药品', value: data.special.radioactive },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '品种数', dataIndex: 'value', key: 'value' },
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
