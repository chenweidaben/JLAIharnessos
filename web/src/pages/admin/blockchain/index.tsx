/**
 * 健澜科技 jlmedaios - 区块链页（M196-D）
 *
 * 节点/处方/病历/药品/耗材/医保/血液/治理。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  network: { nodes: number; consensus: string; blockHeight: number; throughput: number };
  prescriptionOnChain: { count: number };
  emrSharing: { count: number };
  drugTrace: { drugs: number; batches: number };
  consumableTrace: { items: number; batches: number };
  insuranceOnChain: { settlements: number };
  bloodTrace: { bags: number };
  governance: { consortium: boolean; crossChain: boolean; smartContracts: number; privacyComputing: boolean };
  suggestions: string[];
}

export default function BlockchainPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/blockchain/report');
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
        <Title level={3} style={{ color: VI.deep }}>区块链应用</Title>
        <Paragraph type="secondary">电子处方 / 病历共享 / 药品溯源 / 耗材溯源 / 医保结算 / 血液溯源</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="链上节点" value={data.network.nodes} /></Card></Col>
              <Col span={6}><Card><Statistic title="区块高度" value={data.network.blockHeight} /></Card></Col>
              <Col span={6}><Card><Statistic title="TPS" value={data.network.throughput} /></Card></Col>
              <Col span={6}>
                <Card title="共识机制">
                  <Tag color="blue">{data.network.consensus}</Tag>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>链上应用统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'rx', name: '电子处方上链', count: data.prescriptionOnChain.count },
                  { key: 'emr', name: '病历共享', count: data.emrSharing.count },
                  { key: 'drug', name: '药品溯源', count: data.drugTrace.batches },
                  { key: 'cons', name: '耗材溯源', count: data.consumableTrace.batches },
                  { key: 'ins', name: '医保结算上链', count: data.insuranceOnChain.settlements },
                  { key: 'blood', name: '血液溯源', count: data.bloodTrace.bags },
                ]}
                columns={[
                  { title: '应用', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
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
