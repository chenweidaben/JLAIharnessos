/**
 * 健澜科技 jlmedaios - 手术 V3 页（M204-B）
 *
 * 手术排程/分级/麻醉/质量/PACU/日间手术。深海蓝 VI。
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
  scheduling: { totalSlots: number; usedSlots: number; onTimeRate: number; avgTurnoverMin: number };
  grading: { level1: number; level2: number; level3: number; level4: number; complicationRate: number };
  anesthesia: { asa1: number; asa2: number; asa3: number; asa4: number; postOpPainScore: number };
  quality: { ssiRate: number; foreignBodyRate: number; pathologyMatchRate: number };
  pacu: { admissions: number; avgStayMin: number; unplannedAdmission: number };
  daySurgery: { total: number; sameDayDischarge: number };
  suggestions: string[];
}

export default function SurgeryV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/surgery/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>手术麻醉 V2 深化</Title>
        <Paragraph type="secondary">手术间利用率 / 三四级手术占比 / ASA 分级 / SSI 切口感染 / PACU / 日间手术</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手术间利用率" value={`${((data.scheduling.usedSlots / data.scheduling.totalSlots) * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="三四级手术" value={data.grading.level3 + data.grading.level4} /></Card></Col>
              <Col span={6}><Card><Statistic title="SSI 切口感染" value={`${(data.quality.ssiRate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="日间手术" value={data.daySurgery.total} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>手术分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'l1', name: '一级手术', value: data.grading.level1 },
                  { key: 'l2', name: '二级手术', value: data.grading.level2 },
                  { key: 'l3', name: '三级手术', value: data.grading.level3 },
                  { key: 'l4', name: '四级手术', value: data.grading.level4 },
                ]}
                columns={[
                  { title: '分级', dataIndex: 'name', key: 'name' },
                  { title: '台数', dataIndex: 'value', key: 'value' },
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
