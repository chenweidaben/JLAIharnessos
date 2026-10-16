/**
 * 健澜科技 jlmedaios - 特种设备与危化品页（M229-C）
 *
 * 电梯/压力容器/锅炉/起重/医用气体（氧气/负压/压缩空气）/危化品MSDS/泄漏应急/放射源/实验室生物安全。深海蓝 VI。
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
  equipment: { elevators: number; pressureVessels: number; boilers: number; cranes: number };
  management: { inspections: number };
  medicalGas: { oxygen: boolean; vacuum: boolean; air: boolean };
  chemicals: { msds: number; leaks: number };
  radiation: { sources: number };
  lab: { bioSafety: boolean };
  testing: { samples: number };
  training: { sessions: number };
  suggestions: string[];
}

export default function SpecialEquipHazmatReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/special-equip-hazmat/report');
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
        <Title level={3} style={{ color: VI.deep }}>特种设备与危化品</Title>
        <Paragraph type="secondary">电梯·压力容器·锅炉·起重 / 医用气体（氧气·负压·压缩空气） / 危化品 MSDS·泄漏应急 / 放射源·实验室生物安全</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="电梯" value={data.equipment.elevators} /></Card></Col>
              <Col span={6}><Card><Statistic title="压力容器" value={data.equipment.pressureVessels} /></Card></Col>
              <Col span={6}><Card><Statistic title="检验次数" value={data.management.inspections} /></Card></Col>
              <Col span={6}><Card><Statistic title="放射源" value={data.radiation.sources} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全管理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'boiler', name: '锅炉', value: data.equipment.boilers },
                  { key: 'crane', name: '起重设备', value: data.equipment.cranes },
                  { key: 'msds', name: 'MSDS 档案', value: data.chemicals.msds },
                  { key: 'training', name: '安全培训', value: data.training.sessions },
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
