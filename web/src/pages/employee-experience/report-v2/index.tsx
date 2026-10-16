/**
 * 健澜科技 jlmedaios - 员工体验 V2 页（M218-B）
 *
 * 入职30-60-90/工作环境/职业发展/薪酬福利/工作负荷/EAP关怀/团队文化/校友网络。深海蓝 VI。
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
  onboarding: { days30: number; days90: number };
  environment: { satisfaction: number };
  career: { promotionRate: number };
  compensation: { satisfaction: number };
  workload: { avg: number };
  eap: { sessions: number };
  culture: { score: number };
  alumni: { network: number };
  suggestions: string[];
}

export default function EmployeeExperienceV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/employee-experience/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>员工体验 V2</Title>
        <Paragraph type="secondary">入职 30·60·90 / 工作环境 / 职业发展 / 薪酬福利 / 工作负荷·倦怠 / EAP 关怀</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="环境满意度" value={`${data.environment.satisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="薪酬满意度" value={`${data.compensation.satisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="EAP 咨询" value={data.eap.sessions} /></Card></Col>
              <Col span={6}><Card><Statistic title="校友网络" value={data.alumni.network} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>入职与发展</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'd30', name: '30 天留存', value: `${data.onboarding.days30}%` },
                  { key: 'd90', name: '90 天留存', value: `${data.onboarding.days90}%` },
                  { key: 'promo', name: '晋升率', value: `${(data.career.promotionRate * 100).toFixed(1)}%` },
                  { key: 'wl', name: '平均工作负荷比', value: data.workload.avg.toFixed(2) },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
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
