/**
 * 健澜科技 jlmedaios - 科研管理页（M191-A）
 *
 * 科研项目/论文/成果/人员/平台 + 转化率 + 改进建议。深海蓝 VI。
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
  projects: { national: number; provincial: number; municipal: number; dept: number };
  papers: { sci: number; core: number; stats: number; totalIF: number };
  achievements: { patents: number; softwareCopyrights: number; awards: number };
  personnel: { phd: number; master: number; senior: number; deputySenior: number };
  platforms: { keyLab: number; researchCenter: number };
  conversionRate: number;
  researchScore: number;
  suggestions: string[];
}

export default function ResearchManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/research/report');
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
        <Title level={3} style={{ color: VI.deep }}>科研管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">项目 / 论文 / 成果 / 人员 / 平台 + 科研转化率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="国家级项目" value={data.projects.national} /></Card></Col>
              <Col span={4}><Card><Statistic title="SCI 论文" value={data.papers.sci} /></Card></Col>
              <Col span={4}><Card><Statistic title="专利" value={data.achievements.patents} /></Card></Col>
              <Col span={4}><Card><Statistic title="博士人数" value={data.personnel.phd} /></Card></Col>
              <Col span={4}><Card><Statistic title="转化率" value={`${(data.conversionRate * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={4}><Card><Statistic title="科研绩效" value={data.researchScore} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研项目分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'national', name: '国家级', count: data.projects.national },
                  { key: 'provincial', name: '省部级', count: data.projects.provincial },
                  { key: 'municipal', name: '市厅级', count: data.projects.municipal },
                  { key: 'dept', name: '院级', count: data.projects.dept },
                ]}
                columns={[
                  { title: '级别', dataIndex: 'name', key: 'name' },
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
