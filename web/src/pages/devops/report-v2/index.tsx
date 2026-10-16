/**
 * 健澜科技 jlmedaios - DevOps V2 页（M216-C）
 *
 * CI/CD/代码质量/环境管理/发布/自动化测试/制品库/IaC/DORA四指标。深海蓝 VI。
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
  cicd: { pipelines: number; builds: number };
  codeQuality: { coverage: number; sonar: boolean };
  environment: { dev: number; test: number; prod: number };
  release: { deployments: number };
  test: { automation: number };
  artifact: { repository: boolean };
  iac: { terraform: boolean; ansible: boolean };
  dora: { deploys: number; leadTime: number; failureRate: number; recoveryTime: number };
  suggestions: string[];
}

export default function DevOpsV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/devops/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>DevOps 深化 V2</Title>
        <Paragraph type="secondary">CI/CD 流水线 / 代码质量 / 发布自动化 / IaC Terraform · Ansible / DORA 四指标</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="流水线" value={data.cicd.pipelines} /></Card></Col>
              <Col span={6}><Card><Statistic title="构建次数" value={data.cicd.builds} /></Card></Col>
              <Col span={6}><Card><Statistic title="部署次数" value={data.release.deployments} /></Card></Col>
              <Col span={6}><Card><Statistic title="测试覆盖率" value={`${(data.codeQuality.coverage * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>DORA 四指标</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'dep', name: '部署频率', value: `${data.dora.deploys} 次/月` },
                  { key: 'lt', name: '前置时间', value: `${data.dora.leadTime} 小时` },
                  { key: 'fr', name: '变更失败率', value: `${(data.dora.failureRate * 100).toFixed(0)}%` },
                  { key: 'rt', name: '恢复时间', value: `${data.dora.recoveryTime} 小时` },
                ]}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
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
