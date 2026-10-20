/**
 * 健澜科技 jlmedaios - 院感控制 V2 页（M188-C）
 *
 * 感染率/SSI/CAUTI/CLABSI/VAP + 消毒合格率 + 手卫生 + 风险预测。
 * 深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
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
  infectionRate: number;
  ssiRate: number;
  cautiRate: number;
  clabsiRate: number;
  vapiRate: number;
  sterilizationPassRate: number;
  handHygieneCompliance: number;
  riskLevel: { level: 'low' | 'medium' | 'high'; reason: string };
  suggestions: string[];
}

function riskColor(l: string): "error" | "warning" | "success" {
  if (l === 'high') return 'error';
  if (l === 'medium') return 'warning';
  return 'success';
}

export default function InfectionControlV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/infection/control/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>院感控制 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">感染率 / SSI / CAUTI / CLABSI / VAP / 手卫生 / 风险预测</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Alert
              type={riskColor(data.riskLevel.level)}
              showIcon
              style={{ marginBottom: 16 }}
              message={`风险等级：${data.riskLevel.level}`}
              description={data.riskLevel.reason}
            />

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="感染率(‰)" value={data.infectionRate} /></Card></Col>
              <Col span={4}><Card><Statistic title="SSI率(%)" value={data.ssiRate} /></Card></Col>
              <Col span={4}><Card><Statistic title="CAUTI(‰)" value={data.cautiRate} /></Card></Col>
              <Col span={4}><Card><Statistic title="CLABSI(‰)" value={data.clabsiRate} /></Card></Col>
              <Col span={4}><Card><Statistic title="VAP(‰)" value={data.vapiRate} /></Card></Col>
              <Col span={4}>
                <Card title="手卫生依从率">
                  <Progress percent={Math.round(data.handHygieneCompliance * 100)} size="small" status={data.handHygieneCompliance >= 0.8 ? 'success' : 'exception'} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Tag color="blue">建议</Tag><Text style={{ marginLeft: 8 }}>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
