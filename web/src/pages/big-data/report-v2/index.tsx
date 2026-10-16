/**
 * 健澜科技 jlmedaios - 大数据 V2 页（M215-A）
 *
 * 数据采集/ODS-DWD-DWS-ADS/Spark-Flink/治理/服务/应用/资产。深海蓝 VI。
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
  collection: { business: number; device: number; external: number; log: number; iot: number };
  storage: { ods: number; dwd: number; dws: number; ads: number };
  compute: { batch: number; streaming: number; realtime: number };
  governance: { rules: number };
  service: { api: number };
  application: { dashboard: number };
  asset: { catalog: number };
  platform: { hadoop: boolean; spark: boolean; flink: boolean };
  suggestions: string[];
}

export default function BigDataV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/big-data/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医疗大数据平台 V2</Title>
        <Paragraph type="secondary">ODS/DWD/DWS/ADS 数仓分层 / Spark 批处理 · Flink 流计算 / 数据治理 · 服务 API</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="ODS 表" value={data.storage.ods} /></Card></Col>
              <Col span={6}><Card><Statistic title="DWD 表" value={data.storage.dwd} /></Card></Col>
              <Col span={6}><Card><Statistic title="服务 API" value={data.service.api} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据资产" value={data.asset.catalog} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据计算</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'batch', name: '批处理（Spark）', value: data.compute.batch },
                  { key: 'stream', name: '流处理（Flink）', value: data.compute.streaming },
                  { key: 'rt', name: '实时计算', value: data.compute.realtime },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '任务数', dataIndex: 'value', key: 'value' },
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
