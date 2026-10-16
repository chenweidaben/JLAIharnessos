/**
 * 健澜科技 jlmedaios - 多 Agent 协作页（M201-B）
 *
 * 5-MUSE编排/任务分发/通信/冲突解决/工作流/监控/记忆/进化。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  agents: { doctor: boolean; nurse: boolean; pharma: boolean; admin: boolean; patient: boolean; total: number };
  orchestration: { tasks: number; avgAgentsPerTask: number };
  communication: { messages: number; sharedContexts: number };
  collaboration: { decisions: number; conflictsResolved: number };
  workflow: { automated: number };
  monitoring: { active: number };
  memory: { shared: number };
  evolution: { iterations: number };
  suggestions: string[];
}

export default function MultiAgentPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/multi-agent/report');
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
        <Title level={3} style={{ color: VI.deep }}>多 Agent 协作深化</Title>
        <Paragraph type="secondary">5-MUSE 编排 / 任务分发 / Agent 通信 / 冲突解决 / 工作流自动化 / 监控 / 记忆 / 进化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="Agent 总数" value={data.agents.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="编排任务" value={data.orchestration.tasks} /></Card></Col>
              <Col span={6}><Card><Statistic title="协作决策" value={data.collaboration.decisions} /></Card></Col>
              <Col span={6}><Card><Statistic title="冲突解决" value={data.collaboration.conflictsResolved} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>Agent 角色</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'doc', name: 'Doctor MUSE', on: data.agents.doctor },
                  { key: 'nur', name: 'Nurse MUSE', on: data.agents.nurse },
                  { key: 'pha', name: 'Pharma MUSE', on: data.agents.pharma },
                  { key: 'adm', name: 'Admin MUSE', on: data.agents.admin },
                  { key: 'pat', name: 'Patient MUSE', on: data.agents.patient },
                ]}
                columns={[
                  { title: '角色', dataIndex: 'name', key: 'name' },
                  { title: '已启用', dataIndex: 'on', key: 'on', render: (on: boolean) => <Tag color={on ? 'green' : 'red'}>{on ? '是' : '否'}</Tag> },
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
