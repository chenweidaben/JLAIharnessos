/**
 * 健澜科技 jlmedaios - 质量管理体系页（M193-C）
 *
 * 组织/制度/培训/检查/PDCA/QCC/RCA + 国家 10 项目标。深海蓝 VI。
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
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  organization: { committee: boolean; qualityGroups: number; qualityOfficers: number };
  standards: { coverage: number; updated: number };
  training: { hours: number; coverage: number };
  inspection: { frequency: number; problems: number };
  improvement: { pdca: number; qcc: number; rca: number };
  nationalGoals: { total: number; achieved: number; details: string[] };
  score: number;
  suggestions: string[];
}

export default function QualitySystemPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/quality-system/report');
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
        <Title level={3} style={{ color: VI.deep }}>质量管理体系 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">组织 / 制度 / 培训 / 检查 / PDCA-QCC-RCA / 国家 10 项目标</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="质量委员会">
                  {data.organization.committee ? <Tag color="green">已建立</Tag> : <Tag color="red">未建立</Tag>}
                  <Text> {data.organization.qualityGroups} 个质控小组</Text>
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="质控员人数" value={data.organization.qualityOfficers} /></Card></Col>
              <Col span={6}>
                <Card title="标准覆盖率">
                  <Progress percent={Math.round(data.standards.coverage * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="体系评分" value={data.score} suffix="/100" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>国家医疗质量安全改进目标达成</Text>} style={{ marginBottom: 16 }}>
              <Statistic title="已达成" value={`${data.nationalGoals.achieved} / ${data.nationalGoals.total}`} />
              <List
                size="small"
                dataSource={data.nationalGoals.details}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进项目</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pdca', name: 'PDCA 循环', count: data.improvement.pdca },
                  { key: 'qcc', name: 'QCC 品管圈', count: data.improvement.qcc },
                  { key: 'rca', name: 'RCA 根因分析', count: data.improvement.rca },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '项目数', dataIndex: 'count', key: 'count' },
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
