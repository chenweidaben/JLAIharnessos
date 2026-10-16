/**
 * 健澜科技 jlmedaios - 麻醉管理页（M190-C）
 *
 * 麻醉量/ASA 分级/并发症率/苏醒率/工作量/设备预警。深海蓝 VI。
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
  totalCases: number;
  asaDistribution: { grade: string; count: number }[];
  complicationRate: number;
  recoveryRate: number;
  workload: { totalHours: number; caseCount: number; avgHours: number };
  equipmentAlerts: string[];
}

export default function AnesthesiaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/anesthesia/report');
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
        <Title level={3} style={{ color: VI.deep }}>麻醉管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">ASA 分级 / 并发症率 / 苏醒率 / 医生工作量 / 设备预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="本月麻醉例数" value={data.totalCases} /></Card></Col>
              <Col span={6}>
                <Card title="并发症率">
                  <Progress percent={Math.round(data.complicationRate * 1000) / 10} size="small" status={data.complicationRate > 0.05 ? 'exception' : 'success'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="苏醒率">
                  <Progress percent={Math.round(data.recoveryRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="总工作量(小时)" value={data.workload.totalHours} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>ASA 分级分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="grade"
                size="small"
                pagination={false}
                dataSource={data.asaDistribution}
                columns={[
                  { title: 'ASA 分级', dataIndex: 'grade', key: 'grade' },
                  { title: '例数', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>设备安全预警</Text>}>
              <List
                size="small"
                dataSource={data.equipmentAlerts}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color="red">设备</Tag>
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
