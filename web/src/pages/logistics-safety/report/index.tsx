/**
 * 健澜科技 jlmedaios - 后勤安全页（M213-B）
 *
 * 消防/治安/医废联单/污水/被服/膳食/保洁/特种设备。深海蓝 VI。
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
  fire: { facilities: number; drills: number };
  security: { incidents: number; patrols: number };
  waste: { manifests: number; weight: number };
  sewage: { discharge: number; compliant: boolean };
  sewing: { laundry: number };
  food: { meals: number; incidents: number };
  cleaning: { area: number };
  specialEquipment: { elevators: number; boilers: number };
  suggestions: string[];
}

export default function LogisticsSafetyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/logistics-safety/report');
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
        <Title level={3} style={{ color: VI.deep }}>后勤与安全管理</Title>
        <Paragraph type="secondary">消防安全 / 治安巡逻 / 医疗废物联单 / 污水处理 / 被服膳食 / 特种设备</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="消防设施" value={data.fire.facilities} /></Card></Col>
              <Col span={6}><Card><Statistic title="治安事件" value={data.security.incidents} /></Card></Col>
              <Col span={6}><Card><Statistic title="医废联单" value={data.waste.manifests} /></Card></Col>
              <Col span={6}><Card><Statistic title="电梯/锅炉" value={data.specialEquipment.elevators + data.specialEquipment.boilers} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>后勤保障</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'sew', name: '污水排放（吨）', value: data.sewage.discharge },
                  { key: 'sew', name: '被服洗涤（件）', value: data.sewing.laundry },
                  { key: 'food', name: '膳食餐次', value: data.food.meals },
                  { key: 'clean', name: '保洁面积（㎡）', value: data.cleaning.area },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
