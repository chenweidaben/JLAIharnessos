/**
 * 健澜科技 jlmedaios - 工会管理页（M194-C）
 *
 * 工会组织/职代会/福利/帮扶/活动/女职工/EAP/经费。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  organization: { union: number; committee: number; members: number };
  workersCongress: { meetings: number; proposals: number; resolved: number };
  welfare: { perCapita: number; festival: number; birthday: number; healthCheck: number };
  assistance: { assisted: number; amount: number };
  activities: { count: number; participants: number };
  women: { activities: number };
  eap: { sessions: number; participants: number };
  funds: { income: number; expense: number; balance: number };
  suggestions: string[];
}

export default function LaborUnionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/labor-union/report');
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
        <Title level={3} style={{ color: VI.deep }}>工会管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">职代会 / 福利 / 困难帮扶 / 文体活动 / 女职工 / EAP / 经费</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="工会会员" value={data.organization.members} /></Card></Col>
              <Col span={6}><Card><Statistic title="人均福利(元)" value={data.welfare.perCapita} /></Card></Col>
              <Col span={6}><Card><Statistic title="困难帮扶人数" value={data.assistance.assisted} /></Card></Col>
              <Col span={6}><Card><Statistic title="文体活动" value={data.activities.count} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>职工福利明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'festival', name: '节日慰问费', amount: data.welfare.festival },
                  { key: 'birthday', name: '生日慰问费', amount: data.welfare.birthday },
                  { key: 'health', name: '健康体检', amount: data.welfare.healthCheck },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '金额(元)', dataIndex: 'amount', key: 'amount' },
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
