/**
 * 健澜科技 jlmedaios - 等级评审 V3 页（M230-B）
 *
 * 三级综合评审标准/核心条款▲/自查自评/问题清单销号/医疗质量安全/患者安全目标/PDCA/追踪方法学/迎评/评审后改进。深海蓝 VI。
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
  standard: { clauses: number; coreClauses: number };
  selfAssessment: { completed: number };
  function: { evaluated: number };
  quality: { safetyGoals: number };
  management: { pdca: number };
  improvement: { tracer: number };
  preparation: { ready: boolean };
  postReview: { improvements: number };
  suggestions: string[];
}

export default function AccreditationV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/accreditation/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>等级评审 V3</Title>
        <Paragraph type="secondary">三级综合评审标准·核心条款 / 自查自评·问题销号 / 医疗质量安全·患者安全目标 / PDCA·追踪方法学·迎评·评审后改进</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="评审条款" value={data.standard.clauses} /></Card></Col>
              <Col span={6}><Card><Statistic title="核心条款" value={data.standard.coreClauses} /></Card></Col>
              <Col span={6}><Card><Statistic title="自查完成" value={data.selfAssessment.completed} /></Card></Col>
              <Col span={6}><Card><Statistic title="PDCA项目" value={data.management.pdca} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>评审工作明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'func', name: '功能评价', value: data.function.evaluated },
                  { key: 'safety', name: '患者安全目标', value: data.quality.safetyGoals },
                  { key: 'tracer', name: '追踪案例', value: data.improvement.tracer },
                  { key: 'post', name: '评审后改进', value: data.postReview.improvements },
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
