/**
 * 健澜科技 jlmedaios - 安宁疗护页（M220-D）
 *
 * 全人全家全程全队/症状管理/心理·哀伤辅导/DNR生前预嘱/安宁团队/病房/死亡教育/质量评价。深海蓝 VI。
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
  concept: { wholePerson: boolean; wholeFamily: boolean };
  symptom: { pain: number; dyspnea: number; delirium: number };
  psych: { counseling: number };
  ethics: { dnr: number; advanceDirective: number };
  team: { members: number };
  ward: { beds: number };
  deathEducation: { sessions: number };
  quality: { score: number };
  suggestions: string[];
}

export default function HospiceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/hospice/report');
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
        <Title level={3} style={{ color: VI.deep }}>安宁疗护</Title>
        <Paragraph type="secondary">全人·全家·全程·全队照护 / 症状管理 / 心理·哀伤辅导 / DNR 生前预嘱 / 死亡教育</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="疼痛管理" value={data.symptom.pain} /></Card></Col>
              <Col span={6}><Card><Statistic title="心理辅导" value={data.psych.counseling} /></Card></Col>
              <Col span={6}><Card><Statistic title="DNR 签署" value={data.ethics.dnr} /></Card></Col>
              <Col span={6}><Card><Statistic title="安宁床位" value={data.ward.beds} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>症状管理与伦理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'dysp', name: '呼吸困难', value: data.symptom.dyspnea },
                  { key: 'del', name: '谵妄管理', value: data.symptom.delirium },
                  { key: 'ad', name: '生前预嘱', value: data.ethics.advanceDirective },
                  { key: 'team', name: '团队成员', value: data.team.members },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
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
