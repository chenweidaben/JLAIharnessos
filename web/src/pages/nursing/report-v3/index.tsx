/**
 * 健澜科技 jlmedaios - 护理 V3 页（M205-A）
 *
 * 护理分级/安全事件/人力/培训/专科护理。深海蓝 VI。
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
  grading: { special: number; level1: number; level2: number; level3: number; complianceRate: number };
  safety: { fall: number; pressureUlcer: number; bedFall: number; tubeDisplacement: number; medError: number };
  documentation: { completeRate: number };
  staffing: { bedNurseRatio: number; nursePatientRatio: number; nightShiftCoverage: number };
  training: { threeBaseExam: number; passRate: number };
  specialty: { icu: number; or: number; dialysis: number; nicu: number; picc: number };
  quality: { sensitiveIndicators: number; pdcaCycles: number };
  suggestions: string[];
}

export default function NursingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/nursing/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>护理管理 V2 深化</Title>
        <Paragraph type="secondary">护理分级 / 跌倒·压疮·管路滑脱 / 床护比 / 三基三严 / 专科护理 ICU·手术室·PICC</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="特级护理" value={data.grading.special} /></Card></Col>
              <Col span={6}><Card><Statistic title="跌倒事件" value={data.safety.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="床护比" value={data.staffing.bedNurseRatio.toFixed(2)} /></Card></Col>
              <Col span={6}><Card><Statistic title="三基考试" value={data.training.threeBaseExam} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>护理安全事件</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fall', name: '跌倒', value: data.safety.fall },
                  { key: 'pu', name: '压疮', value: data.safety.pressureUlcer },
                  { key: 'bf', name: '坠床', value: data.safety.bedFall },
                  { key: 'td', name: '管路滑脱', value: data.safety.tubeDisplacement },
                  { key: 'me', name: '给药错误', value: data.safety.medError },
                ]}
                columns={[
                  { title: '事件类型', dataIndex: 'name', key: 'name' },
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
