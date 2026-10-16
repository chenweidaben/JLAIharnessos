/**
 * 健澜科技 jlmedaios - 药房 V3 页（M204-C）
 *
 * 门诊/住院/PIVAS/抗菌药物/麻精/临床药学/ADR。深海蓝 VI。
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
  outpatient: { prescriptions: number; reviewed: number; intervention: number };
  inpatient: { medications: number; wardPharmacy: number };
  pivas: { admixtures: number; errors: number };
  antibiotics: { ddd: number; usageRate: number; specialLevelConsult: number; cultureRate: number };
  narcotic: { fiveSpecialtyCompliant: boolean };
  clinical: { wardRound: number; consultation: number; monitoring: number };
  adr: { reported: number; analyzed: number };
  suggestions: string[];
}

export default function PharmacyV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/pharmacy/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>药房药事 V2 深化</Title>
        <Paragraph type="secondary">处方点评 / PIVAS 静配 / 抗菌药物 DDD / 麻精五专 / 临床药学查房 / ADR 闭环</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊处方" value={data.outpatient.prescriptions} /></Card></Col>
              <Col span={6}><Card><Statistic title="PIVAS 静配" value={data.pivas.admixtures} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌 DDD" value={data.antibiotics.ddd} /></Card></Col>
              <Col span={6}><Card><Statistic title="ADR 上报" value={data.adr.reported} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>抗菌药物管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ddd', name: 'DDD 值', value: data.antibiotics.ddd },
                  { key: 'use', name: '使用率', value: `${(data.antibiotics.usageRate * 100).toFixed(0)}%` },
                  { key: 'con', name: '特殊级会诊', value: data.antibiotics.specialLevelConsult },
                  { key: 'cul', name: '微生物送检率', value: `${(data.antibiotics.cultureRate * 100).toFixed(0)}%` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
