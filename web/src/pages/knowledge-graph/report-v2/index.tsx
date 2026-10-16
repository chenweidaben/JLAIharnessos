/**
 * 健澜科技 jlmedaios - 知识图谱 V2 页（M208-D）
 *
 * 图谱构建/知识来源/规则库/规则引擎/检索/更新/应用/质量。深海蓝 VI。
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
  graph: { entities: number; relations: number };
  sources: { guidelines: number; textbooks: number; literature: number; pharmacopeia: number };
  rules: { total: number; active: number };
  engine: { configured: number; tested: number; released: number };
  search: { queries: number };
  update: { lastUpdate: string };
  applications: { cdss: number };
  quality: { accuracy: number };
  suggestions: string[];
}

export default function KnowledgeGraphV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/knowledge-graph/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医学知识图谱 V2 深化</Title>
        <Paragraph type="secondary">疾病-症状-药品-检查实体关系 / 指南·教材·文献知识来源 / 临床规则引擎</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="实体数" value={data.graph.entities} /></Card></Col>
              <Col span={6}><Card><Statistic title="关系数" value={data.graph.relations} /></Card></Col>
              <Col span={6}><Card><Statistic title="规则总数" value={data.rules.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${(data.quality.accuracy * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>知识来源</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'g', name: '指南', value: data.sources.guidelines },
                  { key: 't', name: '教材', value: data.sources.textbooks },
                  { key: 'l', name: '文献', value: data.sources.literature },
                  { key: 'p', name: '药典', value: data.sources.pharmacopeia },
                ]}
                columns={[
                  { title: '来源', dataIndex: 'name', key: 'name' },
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
