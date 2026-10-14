/**
 * 健澜科技 jlmedaios - AI 原生 · 住院天数与费用预测（M88-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   GET  /api/v1/los-predictions/latest?visitId=     最近一次预测
 *   POST /api/v1/los-predictions/predict              AI 预测 + 风险分层（权限 ai_los_pred:view）
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Col, Empty, Input, InputNumber, Layout, Row, Space, Spin, Statistic, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useLosPredictionStore } from '@/store/aiNativeStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const RISK_TAG: Record<string, { color: string; text: string }> = {
  low: { color: 'green', text: '低风险' },
  medium: { color: 'orange', text: '中风险' },
  high: { color: 'red', text: '高风险' },
};

export default function LosPredictionPage() {
  const { latest, loading, submitting, error, loadLatest, predict } = useLosPredictionStore();
  const { hasPermission } = usePermission();

  const [visitId, setVisitId] = useState('');
  const [age, setAge] = useState<number | undefined>(50);
  const [diagnosis, setDiagnosis] = useState('');
  const [comorbidities, setComorbidities] = useState<number | undefined>(0);

  const canView = hasPermission('ai_los_pred:view');

  const handleLoad = () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    void loadLatest(visitId);
  };

  const handlePredict = async () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    const rec = await predict({ visitId, age, diagnosis, comorbidities });
    if (rec) message.success('预测完成');
  };

  const factorCols: ColumnsType<{ factor: string; impact: string }> = [
    { title: '影响因素', dataIndex: 'factor' },
    { title: '对天数/费用的影响', dataIndex: 'impact' },
  ];

  const risk = latest ? RISK_TAG[latest.riskLevel] ?? { color: 'default', text: latest.riskLevel } : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>住院天数与费用预测（AI）</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="预测参数" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input placeholder="就诊号 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 220 }} allowClear />
            <InputNumber placeholder="年龄" min={0} max={130} value={age} onChange={(v) => setAge(v ?? undefined)} />
            <Input placeholder="入院诊断，如 肺炎" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 220 }} allowClear />
            <InputNumber placeholder="合并症种数" min={0} max={20} value={comorbidities} onChange={(v) => setComorbidities(v ?? undefined)} />
          </Space>
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button onClick={handleLoad}>查询最近预测</Button>
              <Button type="primary" loading={submitting} disabled={!canView} onClick={handlePredict}>AI 预测</Button>
            </Space>
          </div>
          {!canView && <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 ai_los_pred:view 权限）</Text>}
        </Card>

        <Spin spinning={loading}>
          {!latest ? (
            <Card size="small"><Empty description="暂无预测结果，输入参数后点击「AI 预测」" /></Card>
          ) : (
            <>
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={24}>
                  <Col span={6}>
                    <Statistic title="预测住院天数" value={latest.predictedLosDays} suffix="天" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="预测住院费用" value={latest.predictedCost} precision={0} prefix="¥" />
                  </Col>
                  <Col span={6}>
                    <Text strong>风险分层：</Text>
                    {risk && <Tag color={risk.color} style={{ fontSize: 14, padding: '4px 12px' }}>{risk.text}</Tag>}
                  </Col>
                  <Col span={6}>
                    <Statistic title="模型置信度" value={((latest.confidence ?? 0) * 100).toFixed(0)} suffix="%" />
                  </Col>
                </Row>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>模型版本：{latest.modelVersion ?? '-'} ｜ 预测时间：{latest.createdAt}</Text>
                </div>
              </Card>
              <Card title="影响因素拆解" size="small">
                <Table rowKey="factor" size="small" pagination={false} dataSource={latest.factors} columns={factorCols} />
              </Card>
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
