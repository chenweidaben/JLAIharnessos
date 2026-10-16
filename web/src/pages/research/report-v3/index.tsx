/**
 * 健澜科技 jlmedaios - 科研 V3 页（M207-B）
 *
 * 课题/论文/专利/成果/团队/平台/伦理/绩效。深海蓝 VI。
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
  projects: { national: number; provincial: number; horizontal: number; internal: number };
  papers: { sci: number; core: number; citations: number };
  patents: { invention: number; utility: number };
  awards: { provincial: number };
  teams: { key: number };
  platforms: { key: number };
  ethics: { reviewed: number; pending: number };
  performance: { score: number };
  suggestions: string[];
}

export default function ResearchV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/research/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>科研管理 V2 深化</Title>
        <Paragraph type="secondary">纵向/横向课题 / SCI·核心论文 / 发明专利 / 伦理审查 / 科研绩效</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国家级课题" value={data.projects.national} /></Card></Col>
              <Col span={6}><Card><Statistic title="SCI 论文" value={data.papers.sci} /></Card></Col>
              <Col span={6}><Card><Statistic title="发明专利" value={data.patents.invention} /></Card></Col>
              <Col span={6}><Card><Statistic title="伦理审查" value={data.ethics.reviewed} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>课题分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'nat', name: '国家级', value: data.projects.national },
                  { key: 'prov', name: '省部级', value: data.projects.provincial },
                  { key: 'hor', name: '横向', value: data.projects.horizontal },
                  { key: 'int', name: '院内', value: data.projects.internal },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'value', key: 'value' },
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
