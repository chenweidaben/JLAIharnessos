/**
 * 健澜科技 jlmedaios - 区块链页（M215-D）
 *
 * 联盟链/智能合约/病历共享/药品溯源/SPD溯源/医保反欺诈/科研/健康档案。深海蓝 VI。
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
  platform: { consortium: boolean; smartContract: number };
  eMRSharing: { records: number };
  drugTrace: { drugs: number };
  consumableTrace: { highValue: number };
  insurance: { antiFraud: boolean };
  research: { multiCenter: number };
  healthRecord: { crossOrg: number };
  dataSecurity: { encryption: boolean };
  suggestions: string[];
}

export default function BlockchainReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/blockchain/report');
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
        <Title level={3} style={{ color: VI.deep }}>医疗区块链应用</Title>
        <Paragraph type="secondary">联盟链 / 智能合约 / 电子病历共享 / 药品·高值耗材溯源 / 医保反欺诈 / 多中心科研</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="智能合约" value={data.platform.smartContract} /></Card></Col>
              <Col span={6}><Card><Statistic title="病历上链" value={data.eMRSharing.records} /></Card></Col>
              <Col span={6}><Card><Statistic title="药品溯源" value={data.drugTrace.drugs} /></Card></Col>
              <Col span={6}><Card><Statistic title="高值耗材" value={data.consumableTrace.highValue} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>区块链应用</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'emr', name: '病历共享上链', value: data.eMRSharing.records },
                  { key: 'drug', name: '药品溯源', value: data.drugTrace.drugs },
                  { key: 'cons', name: '高值耗材溯源', value: data.consumableTrace.highValue },
                  { key: 'res', name: '多中心科研', value: data.research.multiCenter },
                ]}
                columns={[
                  { title: '应用', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'value', key: 'value' },
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
