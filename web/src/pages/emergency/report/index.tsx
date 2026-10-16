/**
 * 健澜科技 jlmedaios - 急诊管理报表页（M190-D）
 *
 * 分诊 I-IV / 抢救成功率 / 胸痛/卒中中心 / 绿色通道。深海蓝 VI。
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
  totalVisits: number;
  triageDistribution: { level: string; count: number; pct: number }[];
  rescueSuccessRate: number;
  observationRate: number;
  emergencySurgeryRate: number;
  chestPainDtbMinutes: number;
  strokeDntMinutes: number;
  greenChannelRate: number;
  alerts: string[];
}

export default function EmergencyReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emergency/report');
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
        <Title level={3} style={{ color: VI.deep }}>急诊管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">分诊 I-IV / 抢救成功率 / 胸痛·卒中中心 / 绿色通道</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="本月急诊量" value={data.totalVisits} /></Card></Col>
              <Col span={6}>
                <Card title="抢救成功率">
                  <Progress percent={Math.round(data.rescueSuccessRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="绿色通道达标率">
                  <Progress percent={Math.round(data.greenChannelRate * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="胸痛 D-to-B" value={data.chestPainDtbMinutes} suffix="分钟" />
                  <Statistic title="卒中 DNT" value={data.strokeDntMinutes} suffix="分钟" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>分诊分级分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="level"
                size="small"
                pagination={false}
                dataSource={data.triageDistribution}
                columns={[
                  {
                    title: '级别',
                    dataIndex: 'level',
                    key: 'level',
                    render: (v: string) => {
                      const colors: Record<string, string> = { I: 'red', II: 'orange', III: 'blue', IV: 'default' };
                      return <Tag color={colors[v] ?? 'default'}>{v} 级</Tag>;
                    },
                  },
                  { title: '例数', dataIndex: 'count', key: 'count' },
                  { title: '占比(%)', dataIndex: 'pct', key: 'pct' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>安全预警</Text>}>
              <List
                size="small"
                dataSource={data.alerts}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color="green">达标</Tag>
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
