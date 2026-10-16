/**
 * 健澜科技 jlmedaios - 教学管理页（M191-B）
 *
 * 教学任务/质量/成果/师资/基地 + 改进建议。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  tasks: { undergraduate: number; postgraduate: number; training: number; residency: number };
  quality: { evaluationScore: number; satisfaction: number; incidents: number };
  results: { awards: number; reformProjects: number; papers: number };
  faculty: { phdSupervisor: number; masterSupervisor: number; famousTeachers: number };
  bases: { residencyBase: number; specialtyBase: number };
  teachingScore: number;
  suggestions: string[];
}

export default function TeachingManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/teaching/report');
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
        <Title level={3} style={{ color: VI.deep }}>教学管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">教学任务 / 质量 / 成果 / 师资 / 基地</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="本科课时" value={data.tasks.undergraduate} /></Card></Col>
              <Col span={6}><Card><Statistic title="研究生课时" value={data.tasks.postgraduate} /></Card></Col>
              <Col span={6}>
                <Card title="教学满意度">
                  <Progress percent={Math.round(data.quality.satisfaction * 100)} size="small" status="active" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="教学绩效" value={data.teachingScore} suffix="/100" /></Card></Col>
            </Row>

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
