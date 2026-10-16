/**
 * 健澜科技 jlmedaios - 绩效管理页（M189-A）
 *
 * 科室/医生/护士绩效得分 + 排名 + 改进建议。深海蓝 VI。
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
  deptScore: number;
  deptRanking: Array<{ dept: string; score: number }>;
  doctorRanking: Array<{ doctor: string; dept: string; score: number }>;
  nurseRanking: Array<{ nurse: string; dept: string; score: number }>;
  suggestions: string[];
}

export default function PerformanceManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/performance-management/report');
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
        <Title level={3} style={{ color: VI.deep }}>绩效管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">科室/医生/护士绩效得分 + 排名 + 改进建议</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card><Statistic title="科室绩效得分" value={data.deptScore} suffix="/100" /></Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>科室排名</Text>}>
                  <Table
                    rowKey="dept"
                    size="small"
                    pagination={false}
                    dataSource={data.deptRanking}
                    columns={[
                      { title: '科室', dataIndex: 'dept', key: 'dept' },
                      { title: '得分', dataIndex: 'score', key: 'score' },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>医生排名</Text>}>
                  <Table
                    rowKey="doctor"
                    size="small"
                    pagination={false}
                    dataSource={data.doctorRanking}
                    columns={[
                      { title: '医生', dataIndex: 'doctor', key: 'doctor' },
                      { title: '得分', dataIndex: 'score', key: 'score' },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card title={<Text strong style={{ color: VI.deep }}>护士排名</Text>}>
                  <Table
                    rowKey="nurse"
                    size="small"
                    pagination={false}
                    dataSource={data.nurseRanking}
                    columns={[
                      { title: '护士', dataIndex: 'nurse', key: 'nurse' },
                      { title: '得分', dataIndex: 'score', key: 'score' },
                    ]}
                  />
                </Card>
              </Col>
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
