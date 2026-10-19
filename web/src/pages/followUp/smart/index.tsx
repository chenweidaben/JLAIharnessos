/**
 * 健澜科技 jlmedaios - 智能随访页（M184-B）
 *
 * 选择患者和疾病类型，展示随访计划与再入院风险预测。
 * 深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Layout,
  List,
  Select,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface FollowupNodeV2 {
  dayOffset: number;
  label: string;
  purpose: string;
}

interface FollowupPlanV2 {
  patientId: string;
  condition: string;
  nodes: FollowupNodeV2[];
}

interface FollowupRiskV2 {
  patientId: string;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
}

interface SmartFollowupResp {
  plan: FollowupPlanV2;
  risk: FollowupRiskV2;
}

function riskColor(level: string): string {
  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'green';
}

export default function SmartFollowupPage() {
  const [condition, setCondition] = useState('hypertension');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SmartFollowupResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<SmartFollowupResp>('/api/v1/followup/smart', {
          query: { patientId: 'demo-patient', condition },
        });
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [condition]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>智能随访管理</Title>
        <Paragraph type="secondary">慢病/术后/用药/满意度随访计划 + 再入院风险预测</Paragraph>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Select
            value={condition}
            onChange={setCondition}
            style={{ width: 200 }}
            options={[
              { value: 'hypertension', label: '高血压（慢病）' },
              { value: 'diabetes', label: '糖尿病（慢病）' },
              { value: 'chd', label: '冠心病（慢病）' },
              { value: 'post_op', label: '术后随访' },
              { value: 'medication', label: '用药随访' },
              { value: 'satisfaction', label: '满意度调查' },
            ]}
          />
        </Card>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            {data.risk && (
              <Alert
                type={data.risk.riskLevel === 'high' ? 'error' : data.risk.riskLevel === 'medium' ? 'warning' : 'success'}
                showIcon
                style={{ marginBottom: 16 }}
                message={
                  <span>
                    再入院风险：<Tag color={riskColor(data.risk.riskLevel)}>{data.risk.riskLevel}</Tag>
                    评分 {data.risk.score}
                  </span>
                }
                description={
                  data.risk.factors.length > 0
                    ? data.risk.factors.join('、')
                    : '无显著风险因素'
                }
              />
            )}

            <Card title={<Text strong style={{ color: VI.deep }}>随访计划</Text>}>
              <Timeline
                items={data.plan.nodes.map((n) => ({
                  children: (
                    <div>
                      <Text strong style={{ color: VI.mid }}>
                        术后/出院第 {n.dayOffset} 天：{n.label}
                      </Text>
                      <br />
                      <Text type="secondary">{n.purpose}</Text>
                    </div>
                  ),
                }))}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
