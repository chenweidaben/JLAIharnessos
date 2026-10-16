/**
 * 健澜科技 jlmedaios - 门诊管理 V2 页（M225-A）
 *
 * 分时段预约·爽约率/预检分诊·专家专病/候诊时间·诊间结算/处方点评·门诊满意度。深海蓝 VI。
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
  appointment: { scheduled: number; noShow: number };
  triage: { visits: number; expert: number };
  consultation: { avgWait: number; pointSettlement: number };
  prescription: { reviewed: number; qualified: number };
  inspection: { completed: number };
  complaint: { count: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function OutpatientV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/outpatient/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>门诊管理 V2</Title>
        <Paragraph type="secondary">分时段预约·爽约率 / 预检分诊·专家专病 / 候诊时间·诊间结算 / 处方点评·满意度</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="日门诊量" value={data.triage.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="预约数" value={data.appointment.scheduled} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均候诊(分钟)" value={data.consultation.avgWait} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.management.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>门诊运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'noshow', name: '爽约数', value: data.appointment.noShow },
                  { key: 'expert', name: '专家门诊', value: data.triage.expert },
                  { key: 'psc', name: '诊间结算', value: data.consultation.pointSettlement },
                  { key: 'rx', name: '处方点评', value: data.prescription.reviewed },
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
