/**
 * 健澜科技 jlmedaios - 后勤 V3 页（M207-D）
 *
 * 设备全生命周期/计量/SPD/安全/后勤/基建/能源。深海蓝 VI。
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
  equipment: { total: number; critical: number; pmCompliance: number };
  metrology: { calibrated: number; overdue: number };
  spd: { highValueTrace: number };
  safety: { fire: number; security: number; hazmat: number; radiation: number };
  support: { meals: number; cleaning: number };
  construction: { repairs: number };
  energy: { electricity: number; water: number; carbonTons: number };
  suggestions: string[];
}

export default function LogisticsV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/logistics/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>后勤设备与安全 V2 深化</Title>
        <Paragraph type="secondary">设备全生命周期 / 计量检定 / SPD 高值耗材追溯 / 消防安全 / 能源·碳排放</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="设备总数" value={data.equipment.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="计量检定" value={data.metrology.calibrated} /></Card></Col>
              <Col span={6}><Card><Statistic title="高值耗材追溯" value={data.spd.highValueTrace} /></Card></Col>
              <Col span={6}><Card><Statistic title="碳排放（吨）" value={data.energy.carbonTons} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全事件</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fire', name: '消防', value: data.safety.fire },
                  { key: 'sec', name: '治安', value: data.safety.security },
                  { key: 'haz', name: '危化', value: data.safety.hazmat },
                  { key: 'rad', name: '辐射', value: data.safety.radiation },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '事件数', dataIndex: 'value', key: 'value' },
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
