/**
 * 健澜科技 jlmedaios - 康复医学 V2 页（M222-A）
 *
 * ADL/Barthel/PT·OT·ST/假肢矫形器/卒中·脑外伤·脊髓损伤·骨折·心肺专科康复。深海蓝 VI。
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
  assessment: { adl: number; cognitive: number; speech: number; swallow: number };
  therapy: { pt: number; ot: number; st: number };
  engineering: { prosthesis: number; orthosis: number; home: number };
  specialty: { stroke: number; tbi: number; sci: number; fracture: number; cardiac: number };
  nursing: { beds: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function RehabilitationV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/rehabilitation/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>康复医学 V2</Title>
        <Paragraph type="secondary">ADL 评定 / PT·OT·ST / 假肢矫形器 / 卒中·脑外伤·脊髓损伤·心肺专科康复</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ADL 评定" value={data.assessment.adl} /></Card></Col>
              <Col span={6}><Card><Statistic title="PT 治疗" value={data.therapy.pt} /></Card></Col>
              <Col span={6}><Card><Statistic title="OT 治疗" value={data.therapy.ot} /></Card></Col>
              <Col span={6}><Card><Statistic title="康复床位" value={data.nursing.beds} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>专科康复</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'str', name: '卒中康复', value: data.specialty.stroke },
                  { key: 'tbi', name: '脑外伤康复', value: data.specialty.tbi },
                  { key: 'sci', name: '脊髓损伤康复', value: data.specialty.sci },
                  { key: 'car', name: '心肺康复', value: data.specialty.cardiac },
                ]}
                columns={[
                  { title: '专科', dataIndex: 'name', key: 'name' },
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
