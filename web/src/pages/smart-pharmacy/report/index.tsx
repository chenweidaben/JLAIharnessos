/**
 * 健澜科技 jlmedaios - 智慧药房页（M214-D）
 *
 * 自动化药房/智能药柜/PIVAS/中药房/用药咨询/慢病依从性/TDM基因。深海蓝 VI。
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
  automated: { pharmacy: boolean; smartCabinet: number };
  pivas: { prepared: number };
  tcm: { decoctionPieces: number; granules: number; decoction: number; paste: number };
  consultation: { counseling: number };
  chronic: { adherence: number };
  specialPopulation: { elderly: number; pediatric: number; pregnant: number };
  tdm: { tests: number; genetic: number };
  suggestions: string[];
}

export default function SmartPharmacyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/smart-pharmacy/report');
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
        <Title level={3} style={{ color: VI.deep }}>智慧药房与用药服务</Title>
        <Paragraph type="secondary">自动化药房 / 智能药柜 / PIVAS / 中药房 / 用药咨询 / 慢病依从性 / TDM·基因检测</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="智能药柜" value={data.automated.smartCabinet} /></Card></Col>
              <Col span={6}><Card><Statistic title="PIVAS 配置" value={data.pivas.prepared} /></Card></Col>
              <Col span={6}><Card><Statistic title="用药咨询" value={data.consultation.counseling} /></Card></Col>
              <Col span={6}><Card><Statistic title="TDM 检测" value={data.tdm.tests} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>中药房</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pie', name: '饮片', value: data.tcm.decoctionPieces },
                  { key: 'gra', name: '颗粒', value: data.tcm.granules },
                  { key: 'dec', name: '代煎', value: data.tcm.decoction },
                  { key: 'pas', name: '膏方', value: data.tcm.paste },
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
