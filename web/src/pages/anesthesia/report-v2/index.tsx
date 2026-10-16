/**
 * 健澜科技 jlmedaios - 麻醉中心 V2 页（M224-B）
 *
 * ASA分级·气道评估/全麻·椎管内·神经阻滞/PCA术后镇痛·无痛分娩/PACU Steward/麻醉药品·困难气道车。深海蓝 VI。
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
  preop: { asa: number; airway: number };
  method: { ga: number; spinal: number; block: number };
  intraop: { monitored: number };
  analgesia: { pca: number; labor: number };
  pacu: { steward: number };
  narcotics: { controlled: boolean };
  equipment: { difficultCart: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function AnesthesiaV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/anesthesia/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>麻醉中心 V2</Title>
        <Paragraph type="secondary">ASA 分级·气道评估 / 全麻·椎管内·神经阻滞 / PCA 术后镇痛·无痛分娩 / PACU·困难气道车</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ASA 评估" value={data.preop.asa} /></Card></Col>
              <Col span={6}><Card><Statistic title="全麻" value={data.method.ga} /></Card></Col>
              <Col span={6}><Card><Statistic title="PCA 镇痛" value={data.analgesia.pca} /></Card></Col>
              <Col span={6}><Card><Statistic title="无痛分娩" value={data.analgesia.labor} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>麻醉方式与设备</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'spinal', name: '椎管内麻醉', value: data.method.spinal },
                  { key: 'block', name: '神经阻滞', value: data.method.block },
                  { key: 'airway', name: '困难气道评估', value: data.preop.airway },
                  { key: 'cart', name: '困难气道车', value: data.equipment.difficultCart },
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
