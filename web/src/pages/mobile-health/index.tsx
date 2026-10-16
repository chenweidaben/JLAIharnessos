/**
 * 健澜科技 jlmedaios - 移动医疗页（M195-C）
 *
 * 移动医生站/护士站/患者端/输液/护理/查房/随访/可穿戴。深海蓝 VI。
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
  doctorApp: { users: number; tasksCompleted: number };
  nurseApp: { users: number; tasksCompleted: number };
  patientApp: { users: number; mau: number };
  infusion: { mobileInfusions: number };
  nursing: { records: number };
  rounds: { visits: number };
  followup: { cases: number };
  wearable: { devices: number; monitoredPatients: number };
  usage: { totalUsers: number; dauRate: number };
  suggestions: string[];
}

export default function MobileHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/mobile-health/report');
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
        <Title level={3} style={{ color: VI.deep }}>移动医疗深化</Title>
        <Paragraph type="secondary">医生站 / 护士站 / 患者端 / 移动输液 / 护理 / 查房 / 随访 / 可穿戴</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医生站用户" value={data.doctorApp.users} /></Card></Col>
              <Col span={6}><Card><Statistic title="护士站用户" value={data.nurseApp.users} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者端用户" value={data.patientApp.users} /></Card></Col>
              <Col span={6}>
                <Card title="DAU 率">
                  <Progress percent={Math.round(data.usage.dauRate * 100)} size="small" status="active" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>移动业务统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'inf', name: '移动输液', count: data.infusion.mobileInfusions },
                  { key: 'nur', name: '移动护理记录', count: data.nursing.records },
                  { key: 'rou', name: '移动查房', count: data.rounds.visits },
                  { key: 'fol', name: '移动随访', count: data.followup.cases },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
