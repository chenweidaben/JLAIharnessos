/**
 * 健澜科技 jlmedaios - 精神心理页（M202-B）
 *
 * 精神门诊/评估量表/情感障碍/精分/睡眠/儿童心理/老年精神/危机干预。深海蓝 VI。
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
  dept: string;
  timeRange: string;
  outpatient: { visits: number; newPatients: number };
  assessment: { phq9: number; gad7: number; mmse: number; moca: number };
  disorders: { mood: number; schizophrenia: number; anxiety: number };
  sleep: { psgStudies: number; osaPatients: number; insomniaPatients: number };
  special: { childPsych: number; geriatricPsych: number; crisisInterventions: number };
  outcomes: { followupRate: number };
  suggestions: string[];
}

export default function PsychiatryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/specialty/psychiatry/report');
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
        <Title level={3} style={{ color: VI.deep }}>精神心理与睡眠医学</Title>
        <Paragraph type="secondary">PHQ-9/GAD-7/MMSE 量表 / 情感障碍 / 精神分裂 / PSG 睡眠监测 / 儿童老年心理 / 危机干预</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="门诊量" value={data.outpatient.visits} /></Card></Col>
              <Col span={6}><Card><Statistic title="PHQ-9 评估" value={data.assessment.phq9} /></Card></Col>
              <Col span={6}><Card><Statistic title="PSG 监测" value={data.sleep.psgStudies} /></Card></Col>
              <Col span={6}><Card><Statistic title="危机干预" value={data.special.crisisInterventions} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>疾病分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'mood', name: '情感障碍', value: data.disorders.mood },
                  { key: 'sch', name: '精神分裂', value: data.disorders.schizophrenia },
                  { key: 'anx', name: '焦虑障碍', value: data.disorders.anxiety },
                  { key: 'osa', name: 'OSA 患者', value: data.sleep.osaPatients },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '患者数', dataIndex: 'value', key: 'value' },
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
