/**
 * 健澜科技 jlmedaios - 智慧服务评级页（M218-D）
 *
 * 1-5级进阶/线上线下融合/多端一致/AI驱动/预测服务/全程陪伴/评级准备。深海蓝 VI。
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
  currentLevel: { level: number; name: string };
  targetLevel: number;
  capabilities: { total: number };
  omnichannel: { online: number; offline: number };
  ai: { predictive: boolean };
  patientExperience: { score: number };
  readiness: { selfAssessment: boolean };
  suggestions: string[];
}

export default function SmartServiceRatingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/smart-service/report');
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
        <Title level={3} style={{ color: VI.deep }}>智慧服务评级</Title>
        <Paragraph type="secondary">1-5 级进阶 / 线上线下融合 / 多端一致 / AI 驱动·预测服务 / 全程陪伴</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="当前等级" value={`${data.currentLevel.level} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="等级名称" value={data.currentLevel.name} /></Card></Col>
              <Col span={6}><Card><Statistic title="目标等级" value={`${data.targetLevel} 级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="能力总数" value={data.capabilities.total} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>多端与AI</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'online', name: '线上服务覆盖', value: `${data.omnichannel.online}%` },
                  { key: 'offline', name: '线下服务覆盖', value: `${data.omnichannel.offline}%` },
                  { key: 'ai', name: 'AI 预测服务', value: data.ai.predictive ? '已启用' : '未启用' },
                  { key: 'exp', name: '患者体验分', value: data.patientExperience.score },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
