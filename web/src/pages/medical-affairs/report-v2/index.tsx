/**
 * 健澜科技 jlmedaios - 医务 V2 页（M212-B）
 *
 * 核心制度/三级查房/疑难死亡讨论/医师资质/手术分级/MDT/纠纷。深海蓝 VI。
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
  quality: { coreSystems: number; threeLevelRound: number; caseDiscussion: number };
  safety: { adverseEvents: number; disputes: number; accidents: number };
  physician: { certified: number; surgeryGrading: number; mdt: number };
  documentation: { passRate: number };
  training: { legal: number };
  department: { managed: number };
  suggestions: string[];
}

export default function MedicalAffairsV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/medical-affairs/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医务管理 V2</Title>
        <Paragraph type="secondary">核心制度 / 三级查房 / 疑难死亡病例讨论 / 医师资质 / 手术分级 / MDT 会诊</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="核心制度" value={data.quality.coreSystems} /></Card></Col>
              <Col span={6}><Card><Statistic title="三级查房" value={data.quality.threeLevelRound} /></Card></Col>
              <Col span={6}><Card><Statistic title="医疗纠纷" value={data.safety.disputes} /></Card></Col>
              <Col span={6}><Card><Statistic title="文书合格率" value={`${(data.documentation.passRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医疗安全</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ae', name: '不良事件', value: data.safety.adverseEvents },
                  { key: 'disp', name: '医疗纠纷', value: data.safety.disputes },
                  { key: 'acc', name: '医疗事故', value: data.safety.accidents },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
