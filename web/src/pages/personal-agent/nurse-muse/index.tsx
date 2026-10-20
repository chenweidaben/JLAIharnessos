/**
 * 健澜科技 jlmedaios - Nurse MUSE V2 护理智能体页（M185-C）
 *
 * 护理任务提醒、风险评估、知识推荐、经验沉淀。深海蓝 VI。
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
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Task {
  taskId: string;
  patientName: string;
  taskType: string;
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high';
}

interface Result {
  nurseId: string;
  date: string;
  tasks: Task[];
  riskAssessment: { pressureUlcer: string; fall: string; catheterDisplacement: string };
  knowledgeRecommendations: string[];
  experienceLibrary: Array<{ caseId: string; patientCondition: string; successfulPractice: string }>;
}

function pColor(p: string): string {
  if (p === 'high') return 'red';
  if (p === 'medium') return 'orange';
  return 'default';
}

export default function NurseMUSEV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/personal-agent/nurse-muse-v2');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>Nurse MUSE · 护理智能体</Title>
        <Paragraph type="secondary">任务提醒 · 风险评估 · 知识推荐 · 经验沉淀</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>压疮风险</Text>}>
                  <Tag color={pColor(data.riskAssessment.pressureUlcer)}>{data.riskAssessment.pressureUlcer}</Tag>
                </Card>
              </Col>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>跌倒风险</Text>}>
                  <Tag color={pColor(data.riskAssessment.fall)}>{data.riskAssessment.fall}</Tag>
                </Card>
              </Col>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>管路滑脱风险</Text>}>
                  <Tag color={pColor(data.riskAssessment.catheterDisplacement)}>{data.riskAssessment.catheterDisplacement}</Tag>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>今日护理任务</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="taskId"
                size="small"
                pagination={false}
                dataSource={data.tasks}
                columns={[
                  { title: '时间', dataIndex: 'scheduledTime', key: 'scheduledTime', width: 80 },
                  { title: '患者', dataIndex: 'patientName', key: 'patientName' },
                  { title: '任务', dataIndex: 'taskType', key: 'taskType' },
                  { title: '优先级', dataIndex: 'priority', key: 'priority', render: (p: string) => <Tag color={pColor(p)}>{p}</Tag> },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>护理知识推荐</Text>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.knowledgeRecommendations}
                renderItem={(item) => <List.Item><Text>{item}</Text></List.Item>}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>护理经验库</Text>}>
              <List
                size="small"
                dataSource={data.experienceLibrary}
                renderItem={(exp) => (
                  <List.Item>
                    <Text strong>{exp.patientCondition}：</Text>
                    <Text type="secondary">{exp.successfulPractice}</Text>
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
