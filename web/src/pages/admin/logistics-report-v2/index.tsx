/**
 * 健澜科技 jlmedaios - 后勤管理报表页 V2（M192-D）
 *
 * 物业/被服/餐饮/安保/能源/污水/医用气体/太平间。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  housekeeping: { satisfaction: number; area: number };
  linen: { turnover: number; satisfaction: number };
  catering: { mealsPerDay: number; satisfaction: number };
  security: { patrols: number; incidents: number };
  energy: { water: number; electricity: number; gas: number; steam: number; perArea: number; perPatient: number };
  wastewater: { treatmentRate: number; dischargeQuality: string };
  medicalGas: { oxygenSupply: number; pipelineLeakRate: number };
  morgue: { storage: number; turnover: number };
  predictedNeed: { housekeeping: number; security: number; catering: number; linen: number };
  suggestions: string[];
}

export default function LogisticsReportV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/logistics/report');
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
        <Title level={3} style={{ color: VI.deep }}>后勤管理报表 V2 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">物业 / 被服 / 餐饮 / 安保 / 能源 / 污水 / 医用气体 / 太平间</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card title="物业满意度">
                  <Progress percent={Math.round(data.housekeeping.satisfaction * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={4}><Card><Statistic title="日均餐饮" value={data.catering.mealsPerDay} suffix="份" /></Card></Col>
              <Col span={4}><Card><Statistic title="单位面积能耗" value={data.energy.perArea} suffix="kgce/㎡" /></Card></Col>
              <Col span={4}><Card><Statistic title="人均能耗" value={data.energy.perPatient} suffix="kgce/人" /></Card></Col>
              <Col span={4}><Card><Statistic title="污水达标率" value={`${Math.round(data.wastewater.treatmentRate * 100)}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="氧气供应量" value={data.medicalGas.oxygenSupply} suffix="m³" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>能源消耗</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'water', name: '用水量(吨)', amount: data.energy.water },
                  { key: 'elec', name: '用电量(度)', amount: data.energy.electricity },
                  { key: 'gas', name: '用气量(m³)', amount: data.energy.gas },
                  { key: 'steam', name: '用汽量(吨)', amount: data.energy.steam },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'amount', key: 'amount' },
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
