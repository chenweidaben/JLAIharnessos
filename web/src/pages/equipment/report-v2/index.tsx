/**
 * 健澜科技 jlmedaios - 设备 V2 页（M213-A）
 *
 * 全生命周期/绩效/维保/计量/SPD高值耗材/安全/一机一档。深海蓝 VI。
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
  lifecycle: { total: number; newPurchased: number; scrapped: number };
  performance: { utilization: number; positiveRate: number; revenue: number };
  maintenance: { pmCompleted: number; repair: number };
  metrology: { calibrated: number; overdue: number };
  consumable: { highValue: number; lowValue: number };
  safety: { incidents: number };
  archive: { oneMachineOneFile: boolean };
  suggestions: string[];
}

export default function EquipmentV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/equipment/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医疗设备与耗材 V2</Title>
        <Paragraph type="secondary">全生命周期 / 开机率阳性率 / 预防性维保 / 计量检定 / SPD 高值耗材追溯</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="设备总数" value={data.lifecycle.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="利用率" value={`${(data.performance.utilization * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="高值耗材" value={data.consumable.highValue} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全事件" value={data.safety.incidents} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>维保计量</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pm', name: '预防性维保完成率', value: `${data.maintenance.pmCompleted}%` },
                  { key: 'rep', name: '故障维修', value: data.maintenance.repair },
                  { key: 'cal', name: '计量检定', value: data.metrology.calibrated },
                  { key: 'ovd', name: '超期未检', value: data.metrology.overdue },
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
