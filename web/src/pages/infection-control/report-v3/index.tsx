/**
 * 健澜科技 jlmedaios - 院感控制 V3 页（M229-D）
 *
 * 手卫生依从性/ICU·NICU·血透目标监测/MRSA·VRE·CRE·CRAB接触隔离/SSI·CLABSI·CAUTI·VAP bundles。深海蓝 VI。
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
  handHygiene: { compliance: number };
  targeted: { icu: number; nicu: number; hd: number };
  mdro: { mrsa: number; vre: number; cre: number; crab: number };
  antibiotic: { density: number };
  ssi: { rate: number };
  catheter: { clabsi: number; cauti: number; vap: number };
  environment: { sampling: number };
  outbreak: { events: number };
  suggestions: string[];
}

export default function InfectionControlV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/infection-control/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>院感控制 V3</Title>
        <Paragraph type="secondary">手卫生依从性 / ICU·NICU·血透目标监测 / MRSA·VRE·CRE·CRAB 接触隔离 / SSI·CLABSI·CAUTI·VAP bundles</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手卫生依从性" value={`${data.handHygiene.compliance}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="MRSA" value={data.mdro.mrsa} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌药物使用强度" value={data.antibiotic.density} /></Card></Col>
              <Col span={6}><Card><Statistic title="暴发事件" value={data.outbreak.events} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>院感监测明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ssi', name: '手术部位感染率', value: `${data.ssi.rate}%` },
                  { key: 'clabsi', name: 'CLABSI', value: data.catheter.clabsi },
                  { key: 'cauti', name: 'CAUTI', value: data.catheter.cauti },
                  { key: 'vap', name: 'VAP', value: data.catheter.vap },
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
