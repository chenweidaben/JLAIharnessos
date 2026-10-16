/**
 * 健澜科技 jlmedaios - Admin MUSE V2 管理智能体页（M186-A）
 *
 * 多角色管理看板 + 自动决策建议。深海蓝 VI。
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
  Select,
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
  role: string;
  dept: string;
  date: string;
  dean?: { outpatientVisits: number; inpatientCount: number; surgeries: number; drgBalance: number; recordQualificationRate: number; patientSatisfaction: number };
  deptHead?: { bedOccupancyRate: number; averageLOS: number; drgWeight: number; drugRatio: number; supplyRatio: number };
  headNurse?: { pressureUlcerRate: number; fallRate: number; catheterDisplacementRate: number; nursingSatisfaction: number };
  suggestions: Array<{ priority: string; category: string; message: string }>;
}

export default function AdminMUSEV2Page() {
  const [role, setRole] = useState('dean');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/personal-agent/admin-muse-v2', { query: { role } });
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [role]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>Admin MUSE · 管理智能体</Title>
        <Paragraph type="secondary">院长/科主任/护士长多角色看板 + 自动决策建议</Paragraph>

        <Select
          value={role}
          onChange={setRole}
          style={{ width: 200, marginBottom: 16 }}
          options={[
            { value: 'dean', label: '院长视图' },
            { value: 'dept_head', label: '科主任视图' },
            { value: 'head_nurse', label: '护士长视图' },
          ]}
        />

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            {data.dean && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={4}><Card><Statistic title="门诊量" value={data.dean.outpatientVisits} /></Card></Col>
                <Col span={4}><Card><Statistic title="住院量" value={data.dean.inpatientCount} /></Card></Col>
                <Col span={4}><Card><Statistic title="手术量" value={data.dean.surgeries} /></Card></Col>
                <Col span={4}><Card><Statistic title="DRG结余" value={data.dean.drgBalance} suffix="万" /></Card></Col>
                <Col span={4}><Card><Statistic title="病历合格率" value={`${(data.dean.recordQualificationRate * 100).toFixed(1)}%`} /></Card></Col>
                <Col span={4}><Card><Statistic title="患者满意度" value={`${(data.dean.patientSatisfaction * 100).toFixed(1)}%`} /></Card></Col>
              </Row>
            )}

            {data.deptHead && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={5}><Card><Statistic title="床位使用率" value={`${(data.deptHead.bedOccupancyRate * 100).toFixed(0)}%`} /></Card></Col>
                <Col span={5}><Card><Statistic title="平均住院日" value={data.deptHead.averageLOS} suffix="天" /></Card></Col>
                <Col span={5}><Card><Statistic title="DRG权重" value={data.deptHead.drgWeight} /></Card></Col>
                <Col span={5}><Card><Statistic title="药占比" value={`${(data.deptHead.drugRatio * 100).toFixed(1)}%`} /></Card></Col>
                <Col span={4}><Card><Statistic title="耗材占比" value={`${(data.deptHead.supplyRatio * 100).toFixed(1)}%`} /></Card></Col>
              </Row>
            )}

            {data.headNurse && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card><Statistic title="压疮发生率" value={`${(data.headNurse.pressureUlcerRate * 100).toFixed(1)}%`} /></Card></Col>
                <Col span={6}><Card><Statistic title="跌倒发生率" value={`${(data.headNurse.fallRate * 100).toFixed(1)}%`} /></Card></Col>
                <Col span={6}><Card><Statistic title="管路滑脱率" value={`${(data.headNurse.catheterDisplacementRate * 100).toFixed(1)}%`} /></Card></Col>
                <Col span={6}><Card><Statistic title="护理满意度" value={`${(data.headNurse.nursingSatisfaction * 100).toFixed(1)}%`} /></Card></Col>
              </Row>
            )}

            <Card title={<Text strong style={{ color: VI.deep }}>管理决策建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => (
                  <List.Item>
                    <Tag color={s.priority === 'high' ? 'red' : s.priority === 'medium' ? 'orange' : 'default'}>{s.category}</Tag>
                    <Text style={{ marginLeft: 8 }}>{s.message}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
