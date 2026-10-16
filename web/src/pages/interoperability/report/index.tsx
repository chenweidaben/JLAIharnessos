/**
 * 健澜科技 jlmedaios - 互联互通页（M210-B）
 *
 * 整合平台/ESB/WS363-WS445/应用集成/区域协同/四级甲。深海蓝 VI。
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
  architecture: { integratedPlatform: boolean; esb: boolean; masterData: boolean };
  dataset: { ws363: number; ws445: number };
  integration: { his: boolean; emr: boolean; lis: boolean; pacs: boolean; ris: boolean };
  regional: { connected: boolean };
  rating: { current: number; target: number };
  suggestions: string[];
}

export default function InteroperabilityReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/interoperability/report');
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
        <Title level={3} style={{ color: VI.deep }}>互联互通标准化成熟度</Title>
        <Paragraph type="secondary">整合平台 / ESB / 主数据 / WS 363·WS 445 数据集 / HIS·EMR·LIS·PACS·RIS 集成</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="当前等级" value={`${data.rating.current} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="目标等级" value={`${data.rating.target} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="WS363 合规" value={`${(data.dataset.ws363 * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="WS445 合规" value={`${(data.dataset.ws445 * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>应用集成</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'his', name: 'HIS', value: data.integration.his ? '已集成' : '未集成' },
                  { key: 'emr', name: 'EMR', value: data.integration.emr ? '已集成' : '未集成' },
                  { key: 'lis', name: 'LIS', value: data.integration.lis ? '已集成' : '未集成' },
                  { key: 'pacs', name: 'PACS', value: data.integration.pacs ? '已集成' : '未集成' },
                  { key: 'ris', name: 'RIS', value: data.integration.ris ? '已集成' : '未集成' },
                ]}
                columns={[
                  { title: '系统', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
