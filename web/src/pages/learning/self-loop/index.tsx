/**
 * 健澜科技 jlmedaios - 全自学习闭环深化页（M186-D）
 *
 * 经验沉淀/知识复用/模型改进/效果提升/飞轮可视化。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
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
  caseAccumulation: { doctorCases: number; nurseCases: number; pharmaCases: number; total: number };
  knowledgeReuse: { reusedCases: number; reuseRate: number };
  modelImprovement: { updatedRules: number; iterations: number };
  improvementMetrics: { adoptionRate: number; diagnosisAccuracy: number; patientSatisfaction: number };
  flywheel: Array<{ stage: string; value: number }>;
}

export default function SelfLearningLoopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/learning/self-loop');
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
        <Title level={3} style={{ color: VI.deep }}>全自学习闭环 · 深化看板</Title>
        <Paragraph type="secondary">经验沉淀 → 知识复用 → 模型改进 → 效果提升 → 再沉淀</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card><Statistic title="Doctor 沉淀案例" value={data.caseAccumulation.doctorCases} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="Nurse 沉淀案例" value={data.caseAccumulation.nurseCases} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="Pharma 沉淀案例" value={data.caseAccumulation.pharmaCases} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="总沉淀案例" value={data.caseAccumulation.total} /></Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title="知识复用率">
                  <Progress type="circle" percent={Math.round(data.knowledgeReuse.reuseRate * 100)} />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="模型迭代">
                  <Statistic title="更新规则数" value={data.modelImprovement.updatedRules} />
                  <Statistic title="迭代次数" value={data.modelImprovement.iterations} style={{ marginTop: 8 }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="效果提升">
                  <Progress percent={Math.round(data.improvementMetrics.adoptionRate * 100)} format={(p) => `采纳率 ${p}%`} />
                  <Progress percent={Math.round(data.improvementMetrics.diagnosisAccuracy * 100)} format={(p) => `诊断准确 ${p}%`} style={{ marginTop: 8 }} />
                  <Progress percent={Math.round(data.improvementMetrics.patientSatisfaction * 100)} format={(p) => `满意度 ${p}%`} style={{ marginTop: 8 }} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>飞轮闭环</Text>}>
              <Table
                rowKey="stage"
                size="small"
                pagination={false}
                dataSource={data.flywheel}
                columns={[
                  { title: '阶段', dataIndex: 'stage', key: 'stage' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
