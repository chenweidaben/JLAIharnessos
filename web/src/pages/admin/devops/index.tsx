/**
 * 健澜科技 jlmedaios - DevOps 页（M197-C）
 *
 * 代码/CI-CD/蓝绿/金丝雀/制品/变更/DORA。深海蓝 VI。
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
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  code: { repos: number; lines: number; commits: number; branches: number };
  cicd: { pipelines: number; builds: number; deployments: number; successRate: number };
  integration: { lint: number; unitTests: number; integrationTests: number; securityScans: number };
  deployment: { blueGreen: number; canary: number; rolling: number; rollbacks: number };
  environment: { dev: number; staging: number; prod: number };
  artifacts: { stored: number; retentionDays: number };
  change: { approved: number; rejected: number };
  dora: { deploymentFrequency: number; leadTimeHours: number; changeFailRate: number; mttrMinutes: number; level: string; score: number };
  suggestions: string[];
}

export default function DevOpsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/devops/report');
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
        <Title level={3} style={{ color: VI.deep }}>DevOps 深化</Title>
        <Paragraph type="secondary">Git / CI-CD 流水线 / 蓝绿金丝雀 / 制品管理 / 变更管理 / DORA 指标</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="代码仓库" value={data.code.repos} /></Card></Col>
              <Col span={6}><Card><Statistic title="构建次数" value={data.cicd.builds} /></Card></Col>
              <Col span={6}><Card><Statistic title="部署次数" value={data.cicd.deployments} /></Card></Col>
              <Col span={6}>
                <Card title="DORA 等级">
                  <Tag color={data.dora.level === 'elite' ? 'green' : data.dora.level === 'high' ? 'blue' : 'orange'}>
                    {data.dora.level}
                  </Tag>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>DORA 指标</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'df', name: '部署频率(次/天)', value: data.dora.deploymentFrequency },
                  { key: 'lt', name: '前置时间(小时)', value: data.dora.leadTimeHours },
                  { key: 'cfr', name: '变更失败率', value: `${(data.dora.changeFailRate * 100).toFixed(1)}%` },
                  { key: 'mttr', name: '恢复时间(分钟)', value: data.dora.mttrMinutes },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '值', dataIndex: 'value', key: 'value' },
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
