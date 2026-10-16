/**
 * 健澜科技 jlmedaios - 患者服务 V3 页（M206-A）
 *
 * 预约/就诊/便民/投诉/NPS/随访/宣教/志愿者。深海蓝 VI。
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
  appointment: { outpatient: number; expert: number; exam: number; fulfillmentRate: number };
  visit: { smartTriage: number; checkIn: number; avgWaitMin: number; oneStopCenter: boolean };
  convenience: { wheelchair: number; interpreter: number };
  complaint: { total: number; resolved: number; satisfaction: number };
  nps: { promoters: number; detractors: number; total: number };
  followup: { completed: number };
  education: { sessions: number };
  volunteer: { hours: number };
  suggestions: string[];
}

export default function PatientServiceV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/patient-service/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>患者服务 V2 深化</Title>
        <Paragraph type="secondary">预约履约 / 智能导诊 / 候诊时长 / 投诉建议 / NPS / 随访 / 健康宣教</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊预约" value={data.appointment.outpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="候诊时长（分）" value={data.visit.avgWaitMin} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉" value={data.complaint.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={`${((data.nps.promoters - data.nps.detractors) / data.nps.total * 100).toFixed(0)}`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>预约服务</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'op', name: '门诊预约', value: data.appointment.outpatient },
                  { key: 'ex', name: '专家预约', value: data.appointment.expert },
                  { key: 'em', name: '检查预约', value: data.appointment.exam },
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
