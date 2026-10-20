/**
 * 健澜科技 jlmedaios - 物联网平台页（M196-C）
 *
 * 设备接入/状态/数据采集/预警/控制/定位/能耗/智慧病房。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  devices: { medical: number; environmental: number; security: number; wearable: number };
  status: { onlineRate: number; faultRate: number; avgHealthScore: number };
  dataCollection: { points: number; dailyMessages: number };
  alerts: { total: number; acknowledged: number };
  control: { commands: number };
  location: { peopleTracked: number; assetsTracked: number };
  energy: { monitored: number; savings: number };
  applications: { smartWard: number; operatingRoom: number; outpatient: number; logistics: number };
  suggestions: string[];
}

export default function IoTPlatformPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/iot-platform/report');
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
        <Title level={3} style={{ color: VI.deep }}>物联网平台深化</Title>
        <Paragraph type="secondary">设备接入 / 状态 / 数据采集 / 预警 / 控制 / 定位 / 能耗 / 智慧病房</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医疗设备" value={data.devices.medical} /></Card></Col>
              <Col span={6}><Card><Statistic title="可穿戴设备" value={data.devices.wearable} /></Card></Col>
              <Col span={6}>
                <Card title="在线率">
                  <Progress percent={Math.round(data.status.onlineRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="平均健康分" value={data.status.avgHealthScore} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>IoT 应用统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ward', name: '智慧病房', count: data.applications.smartWard },
                  { key: 'or', name: '智慧手术室', count: data.applications.operatingRoom },
                  { key: 'opd', name: '智慧门诊', count: data.applications.outpatient },
                  { key: 'log', name: '智慧后勤', count: data.applications.logistics },
                ]}
                columns={[
                  { title: '应用', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
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
