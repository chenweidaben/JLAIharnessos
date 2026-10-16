/**
 * 健澜科技 jlmedaios - 物联网页（M215-C）
 *
 * 设备接入/智能病房/智能药房/定位/环境监控/预测性维护/MQTT边缘。深海蓝 VI。
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
  deviceOnboarding: { medical: number; environment: number; wearable: number; location: number; security: number };
  smartWard: { beds: number };
  smartPharmacy: { cabinets: number };
  energy: { meters: number };
  rtls: { people: number; assets: number; infantAntiTheft: number };
  environment: { sensors: number };
  predictive: { maintenance: number };
  edge: { mqtt: boolean };
  suggestions: string[];
}

export default function IoTReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/iot/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院物联网平台</Title>
        <Paragraph type="secondary">设备接入 / 智能病房 / RTLS 定位·婴儿防盗 / 环境监控 / 预测性维护 / MQTT 边缘</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医疗设备" value={data.deviceOnboarding.medical} /></Card></Col>
              <Col span={6}><Card><Statistic title="可穿戴设备" value={data.deviceOnboarding.wearable} /></Card></Col>
              <Col span={6}><Card><Statistic title="RTLS 人员" value={data.rtls.people} /></Card></Col>
              <Col span={6}><Card><Statistic title="预测性维护" value={data.predictive.maintenance} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>设备接入</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'med', name: '医疗设备', value: data.deviceOnboarding.medical },
                  { key: 'env', name: '环境设备', value: data.deviceOnboarding.environment },
                  { key: 'wea', name: '可穿戴', value: data.deviceOnboarding.wearable },
                  { key: 'loc', name: '定位设备', value: data.deviceOnboarding.location },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
