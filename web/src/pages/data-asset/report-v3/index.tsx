/**
 * 健澜科技 jlmedaios - 数据资产 V3 页（M206-D）
 *
 * 资产目录/标准/六维质量/安全/共享/应用/治理组织/生命周期。深海蓝 VI。
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
  catalog: { total: number; domains: number };
  standards: { adopted: number };
  quality: { sixDimAvg: number; issueCount: number };
  security: { classified: number; masked: number; watermarked: number };
  sharing: { APIs: number; consumers: number };
  applications: { cdss: number; operation: number; research: number; drg: number };
  governance: { org: number; stewards: number };
  lifecycle: { archived: number };
  suggestions: string[];
}

export default function DataAssetV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/data-asset/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>数据资产与数据治理 V2 深化</Title>
        <Paragraph type="secondary">资产目录 / 数据标准 / 六维质量 / 分类分级 / 数据共享 / CDSS·运营·科研应用</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据资产" value={data.catalog.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="质量均分" value={data.quality.sixDimAvg} /></Card></Col>
              <Col span={6}><Card><Statistic title="共享 API" value={data.sharing.APIs} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据管家" value={data.governance.stewards} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据应用</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cdss', name: 'CDSS 临床决策', value: data.applications.cdss },
                  { key: 'op', name: '运营分析', value: data.applications.operation },
                  { key: 'res', name: '科研', value: data.applications.research },
                  { key: 'drg', name: 'DRG 分组', value: data.applications.drg },
                ]}
                columns={[
                  { title: '应用方向', dataIndex: 'name', key: 'name' },
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
