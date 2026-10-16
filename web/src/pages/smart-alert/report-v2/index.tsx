/**
 * 健澜科技 jlmedaios - 智能预警 V2 页（M208-B）
 *
 * MEWS/危急值/药物/院感/跌倒压疮/VTE/管理/效果。深海蓝 VI。
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
  mews: { alerts: number; responseRate: number };
  criticalValue: { total: number; closedLoop: number };
  medication: { interactions: number; contraindications: number };
  infection: { vap: number; clabsi: number; cauti: number; ssi: number };
  fallPressure: { fall: number; pressureUlcer: number };
  vte: { screened: number; highRisk: number };
  management: { rules: number; falsePositiveRate: number };
  effectiveness: { preventedEvents: number };
  suggestions: string[];
}

export default function SmartAlertV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/smart-alert/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>智能预警 V2 深化</Title>
        <Paragraph type="secondary">MEWS 生命体征 / 危急值闭环 / VAP·CLABSI·CAUTI·SSI 院感 / VTE Caprini</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="MEWS 预警" value={data.mews.alerts} /></Card></Col>
              <Col span={6}><Card><Statistic title="危急值闭环" value={`${(data.criticalValue.closedLoop / data.criticalValue.total * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="VTE 筛查" value={data.vte.screened} /></Card></Col>
              <Col span={6}><Card><Statistic title="预防事件" value={data.effectiveness.preventedEvents} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>院感预警</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'vap', name: 'VAP', value: data.infection.vap },
                  { key: 'clabsi', name: 'CLABSI', value: data.infection.clabsi },
                  { key: 'cauti', name: 'CAUTI', value: data.infection.cauti },
                  { key: 'ssi', name: 'SSI', value: data.infection.ssi },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
