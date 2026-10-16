/**
 * 健澜科技 jlmedaios - 输血管理页（M190-B）
 *
 * 输血记录/反应率/合理性/库存/安全预警。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  totalTransfusions: number;
  reactionRate: number;
  compatibilityRate: number;
  rationalRate: number;
  inventory: { type: string; units: number }[];
  alerts: string[];
}

export default function BloodTransfusionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/blood/transfusion/report');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>输血管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">输血记录 / 反应率 / 相容性 / 合理性 / 库存预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="本月输血例次" value={data.totalTransfusions} /></Card></Col>
              <Col span={6}>
                <Card title="输血反应率">
                  <Progress percent={Math.round(data.reactionRate * 1000) / 10} size="small" status={data.reactionRate > 0.05 ? 'exception' : 'success'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="相容性检测率">
                  <Progress percent={Math.round(data.compatibilityRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="用血合理率">
                  <Progress percent={Math.round(data.rationalRate * 100)} size="small" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>血液库存</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="type"
                size="small"
                pagination={false}
                dataSource={data.inventory}
                columns={[
                  { title: "血液品种", dataIndex: "type", key: "type" },
                  { title: "库存(单位)", dataIndex: "units", key: "units" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>安全预警</Text>}>
              <List
                size="small"
                dataSource={data.alerts}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color="orange">预警</Tag>
                    <Text>{s}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
