/**
 * 健澜科技 jlmedaios - 设备物资管理页（M191-D）
 *
 * 设备台账/使用/维护/耗材/折旧/ROI + 预警。深海蓝 VI。
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
  ledger: { large: number; medium: number; small: number; totalValue: number };
  utilization: { uptimeRate: number; usageRate: number; failureRate: number };
  maintenance: { totalCost: number; mttr: number };
  consumables: { highValueStock: number; lowValueStock: number; monthlyConsumption: number };
  depreciation: { annualDepreciation: number };
  rois: { equipment: string; roi: number; paybackYears: number }[];
  alerts: string[];
}

export default function EquipmentMaterialPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/equipment-material/report');
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
        <Title level={3} style={{ color: VI.deep }}>设备物资管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">设备台账 / 使用 / 维护 / 耗材 / 折旧 / ROI</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="大型设备" value={data.ledger.large} /></Card></Col>
              <Col span={4}><Card><Statistic title="设备总值" value={data.ledger.totalValue} prefix="¥" /></Card></Col>
              <Col span={4}>
                <Card title="开机率">
                  <Progress percent={Math.round(data.utilization.uptimeRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={4}>
                <Card title="故障率">
                  <Progress percent={Math.round(data.utilization.failureRate * 100)} size="small" status={data.utilization.failureRate > 0.05 ? 'exception' : 'normal'} />
                </Card>
              </Col>
              <Col span={4}><Card><Statistic title="高值耗材库存" value={data.consumables.highValueStock} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="年折旧" value={data.depreciation.annualDepreciation} prefix="¥" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>设备 ROI</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="equipment"
                size="small"
                pagination={false}
                dataSource={data.rois}
                columns={[
                  { title: '设备', dataIndex: 'equipment', key: 'equipment' },
                  { title: 'ROI(%)', dataIndex: 'roi', key: 'roi' },
                  { title: '回收期(年)', dataIndex: 'paybackYears', key: 'paybackYears' },
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
