/**
 * 健澜科技 jlmedaios - 教学培训 V2 页（M219-D）
 *
 * 住培基地/研究生点/继教学分/毕业后专培/岗前培训/师资/教学质量/临床学院。深海蓝 VI。
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
  residency: { bases: number; trainees: number };
  graduate: { programs: number; students: number };
  cme: { credits: number };
  postGrad: { fellowship: number };
  preJob: { sessions: number };
  faculty: { teachers: number };
  quality: { score: number };
  hospital: { clinicalCollege: boolean };
  suggestions: string[];
}

export default function TeachingV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/teaching/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>教学培训 V2</Title>
        <Paragraph type="secondary">住培基地 / 研究生点 / 继教学分 / 毕业后专培 / 岗前培训 / 师资 / 临床学院</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="住培基地" value={data.residency.bases} /></Card></Col>
              <Col span={6}><Card><Statistic title="住培学员" value={data.residency.trainees} /></Card></Col>
              <Col span={6}><Card><Statistic title="研究生点" value={data.graduate.programs} /></Card></Col>
              <Col span={6}><Card><Statistic title="教学质量分" value={data.quality.score} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>培训体系</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'cme', name: '继教学分', value: `${data.cme.credits} 分` },
                  { key: 'fellow', name: '专培学员', value: data.postGrad.fellowship },
                  { key: 'pre', name: '岗前培训', value: `${data.preJob.sessions} 期` },
                  { key: 'fac', name: '师资人数', value: data.faculty.teachers },
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
