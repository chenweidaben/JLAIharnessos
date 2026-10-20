/**
 * 健澜科技 jlmedaios - 文档交付页（M200-B）
 *
 * 架构/开发/运维/用户/培训/合规/版本/文档质量。深海蓝 VI。
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
  architecture: { system: boolean; deployment: boolean; data: boolean; security: boolean };
  development: { api: number; database: number; microservice: number; frontend: number };
  ops: { deployment: number; maintenance: number; monitoring: number; emergency: number };
  user: { guides: number; faq: number };
  training: { materials: number; videos: number };
  compliance: { documents: number };
  release: { notes: number };
  quality: { coverage: number; reviewed: number };
  suggestions: string[];
}

export default function DocumentationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/documentation/report');
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
        <Title level={3} style={{ color: VI.deep }}>M200 文档交付</Title>
        <Paragraph type="secondary">架构文档 / 开发文档 / 运维文档 / 用户文档 / 培训文档 / 合规文档 / 版本文档</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="API 文档" value={data.development.api} /></Card></Col>
              <Col span={6}><Card><Statistic title="用户指南" value={data.user.guides} /></Card></Col>
              <Col span={6}><Card><Statistic title="培训材料" value={data.training.materials} /></Card></Col>
              <Col span={6}><Card><Statistic title="文档覆盖率" value={`${(data.quality.coverage * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>文档分类统计</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'arch', name: '架构文档', count: 4 },
                  { key: 'dev', name: '开发文档', count: data.development.api + data.development.database + data.development.microservice + data.development.frontend },
                  { key: 'ops', name: '运维文档', count: data.ops.deployment + data.ops.maintenance + data.ops.monitoring + data.ops.emergency },
                  { key: 'comp', name: '合规文档', count: data.compliance.documents },
                ]}
                columns={[
                  { title: '类别', dataIndex: 'name', key: 'name' },
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
