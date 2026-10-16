/**
 * 健澜科技 jlmedaios - 患者安全目标体系页（M193-D）
 *
 * 国家目标 10 项 / 不良事件 I-IV 分级 / RCA/FMEA / 安全文化。深海蓝 VI。
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
  nationalGoals: { total: number; achieved: number; details: string[] };
  adverseEvents: { total: number; gradeI: number; gradeII: number; gradeIII: number; gradeIV: number };
  reportingRate: number;
  rcaCount: number;
  fmeaCount: number;
  safetyCulture: { score: number };
  training: { coverage: number };
  suggestions: string[];
}

export default function PatientSafetyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/patient-safety/report');
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
        <Title level={3} style={{ color: VI.deep }}>患者安全目标体系 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">国家目标 10 项 / 不良事件分级 / RCA-FMEA / 安全文化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="不良事件总数">
                  <Statistic value={data.adverseEvents.total} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="上报率">
                  <Progress percent={Math.round(data.reportingRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="安全文化评分">
                  <Statistic value={data.safetyCulture.score} suffix="/100" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="培训覆盖率">
                  <Progress percent={Math.round(data.training.coverage * 100)} size="small" status="success" />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>不良事件分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'I', grade: 'I 级（无后果）', count: data.adverseEvents.gradeI },
                  { key: 'II', grade: 'II 级（有后果）', count: data.adverseEvents.gradeII },
                  { key: 'III', grade: 'III 级（未造成后果）', count: data.adverseEvents.gradeIII },
                  { key: 'IV', grade: 'IV 级（隐患）', count: data.adverseEvents.gradeIV },
                ]}
                columns={[
                  { title: '分级', dataIndex: 'grade', key: 'grade' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>国家患者安全目标达成</Text>} style={{ marginBottom: 16 }}>
              <Statistic title="已达成" value={`${data.nationalGoals.achieved} / ${data.nationalGoals.total}`} />
              <List
                size="small"
                dataSource={data.nationalGoals.details}
                renderItem={(s) => <List.Item><Tag color="blue">已达成</Tag><Text style={{ marginLeft: 8 }}>{s}</Text></List.Item>}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>分析与建议</Text>}>
              <Row gutter={16}>
                <Col span={12}><Statistic title="RCA 根因分析" value={data.rcaCount} /></Col>
                <Col span={12}><Statistic title="FMEA 失效分析" value={data.fmeaCount} /></Col>
              </Row>
              <List
                size="small"
                style={{ marginTop: 16 }}
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
