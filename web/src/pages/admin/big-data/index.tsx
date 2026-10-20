/**
 * 健澜科技 jlmedaios - 大数据平台页（M196-A）
 *
 * 数据采集/存储/处理/分析/服务/治理/资产/应用。深海蓝 VI。
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
  ingestion: { sources: number; dailyVolumeGB: number };
  storage: { dataWarehouseTB: number; dataLakeTB: number; realtimeTB: number };
  processing: { etlJobs: number; cleaningRate: number; standardizationRate: number };
  analysis: { olapQueries: number; miningModels: number; mlModels: number };
  services: { apis: number; dailyCalls: number; avgResponseMs: number };
  governance: { qualityScore: number; standards: number; securityLevel: string };
  assets: { catalog: { domain: string; tables: number; volumeTB: number }[]; lineageTracked: number };
  applications: { biDashboards: number; reports: number };
  suggestions: string[];
}

export default function BigDataPlatformPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/big-data/report');
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
        <Title level={3} style={{ color: VI.deep }}>大数据平台深化</Title>
        <Paragraph type="secondary">采集 / 存储 / ETL / OLAP / API / 治理 / 数据目录 / 资产估值</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据源" value={data.ingestion.sources} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据湖(TB)" value={data.storage.dataLakeTB} /></Card></Col>
              <Col span={6}><Card><Statistic title="API 数" value={data.services.apis} /></Card></Col>
              <Col span={6}><Card><Statistic title="质量分" value={data.governance.qualityScore} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据资产目录</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="domain"
                size="small"
                pagination={false}
                dataSource={data.assets.catalog}
                columns={[
                  { title: '域', dataIndex: 'domain', key: 'domain' },
                  { title: '表数', dataIndex: 'tables', key: 'tables' },
                  { title: '容量(TB)', dataIndex: 'volumeTB', key: 'volumeTB' },
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
