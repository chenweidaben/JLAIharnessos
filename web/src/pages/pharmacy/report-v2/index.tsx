/**
 * 健澜科技 jlmedaios - 药事 V2 页（M212-D）
 *
 * 供应/处方点评/抗菌DDD/麻精/PIVAS/临床药学/ADR/质控委员会。深海蓝 VI。
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
  supply: { total: number };
  prescription: { reviewed: number; rational: number };
  rationalUse: { antibioticDdd: number; narcotic: number; keyMonitoring: number };
  pivas: { prepared: number };
  clinicalPharmacy: { wardRound: number };
  adr: { reported: number };
  drugManagement: { inventory: number };
  committee: { meetings: number };
  suggestions: string[];
}

export default function PharmacyV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/pharmacy/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>药事管理 V2</Title>
        <Paragraph type="secondary">药品供应 / 处方点评 / 抗菌药物 DDD / 麻精五专 / PIVAS / 临床药师查房 / ADR</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="处方点评" value={data.prescription.reviewed} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌 DDD" value={data.rationalUse.antibioticDdd} /></Card></Col>
              <Col span={6}><Card><Statistic title="PIVAS 配置" value={data.pivas.prepared} /></Card></Col>
              <Col span={6}><Card><Statistic title="ADR 上报" value={data.adr.reported} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>合理用药</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ddd', name: '抗菌药物 DDD/100床日', value: data.rationalUse.antibioticDdd },
                  { key: 'nar', name: '麻精药品品种', value: data.rationalUse.narcotic },
                  { key: 'key', name: '重点监控药品', value: data.rationalUse.keyMonitoring },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
