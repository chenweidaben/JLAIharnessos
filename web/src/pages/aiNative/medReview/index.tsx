/**
 * 健澜科技 jlmedaios - AI 原生 · 合理用药审查（M88-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   GET  /api/v1/med-reviews?visitId=           查询某就诊待处理审查
 *   POST /api/v1/med-reviews/run                发起用药审查（权限 med_review:view）
 *   POST /api/v1/med-reviews/:id/override       审查豁免（权限 med_review:override）
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, InputNumber, Layout, Modal, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useMedReviewStore, type MedReview } from '@/store/aiNativeStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SEVERITY_TAG: Record<MedReview['severity'], { color: string; text: string }> = {
  info: { color: 'default', text: '提示' },
  warning: { color: 'orange', text: '警告' },
  critical: { color: 'red', text: '严重' },
};

const TYPE_TAG: Record<string, { color: string; text: string }> = {
  interaction: { color: 'orange', text: '相互作用' },
  dose: { color: 'blue', text: '剂量' },
  allergy: { color: 'red', text: '过敏' },
  info: { color: 'default', text: '信息' },
};

const STATUS_TAG: Record<MedReview['status'], { color: string; text: string }> = {
  open: { color: 'orange', text: '待处理' },
  acknowledged: { color: 'blue', text: '已确认' },
  overridden: { color: 'green', text: '已豁免' },
};

export default function MedReviewPage() {
  const { reviews, loading, submitting, error, load, run, override } = useMedReviewStore();
  const { hasPermission } = usePermission();

  const [visitId, setVisitId] = useState('');
  const [drugName, setDrugName] = useState('');
  const [patientAge, setPatientAge] = useState<number | undefined>(undefined);
  const [allergiesText, setAllergiesText] = useState('');
  const [orderId, setOrderId] = useState('');
  const [overrideTarget, setOverrideTarget] = useState<MedReview | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const canView = hasPermission('med_review:view');
  const canOverride = hasPermission('med_review:override');

  const handleLoad = () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    void load(visitId);
  };

  const handleRun = async () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    if (!drugName) { message.warning('请输入待审查药品名称'); return; }
    const allergies = allergiesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const result = await run({ visitId, drugName, patientAge, allergies, orderId: orderId || undefined });
    message.success(result.length ? `审查完成，命中 ${result.length} 条提醒` : '审查完成，未命中风险规则');
  };

  const columns: ColumnsType<MedReview> = [
    { title: '药品', dataIndex: 'drugName', width: 140 },
    {
      title: '类型', dataIndex: 'reviewType', width: 100,
      render: (v: string) => { const t = TYPE_TAG[v] ?? { color: 'default', text: v }; return <Tag color={t.color}>{t.text}</Tag>; },
    },
    {
      title: '级别', dataIndex: 'severity', width: 90,
      render: (v: MedReview['severity']) => { const s = SEVERITY_TAG[v]; return <Tag color={s.color}>{s.text}</Tag>; },
    },
    { title: '审查信息', dataIndex: 'message' },
    { title: '建议', dataIndex: 'suggestion', render: (v: string | null) => v ?? '-' },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: MedReview['status']) => { const s = STATUS_TAG[v]; return <Tag color={s.color}>{s.text}</Tag>; },
    },
    {
      title: '操作', width: 110,
      render: (_, record) => record.status === 'open' && canOverride ? (
        <Button size="small" onClick={() => { setOverrideTarget(record); setOverrideReason(''); }}>豁免</Button>
      ) : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>合理用药审查（AI）</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="审查参数" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input placeholder="就诊号 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 200 }} allowClear />
            <Input placeholder="药品名称，如 华法林" value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ width: 200 }} allowClear />
            <InputNumber placeholder="患者年龄" min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(v ?? undefined)} />
            <Input placeholder="过敏史（逗号分隔）" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} style={{ width: 200 }} allowClear />
            <Input placeholder="医嘱号 orderId（可选）" value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ width: 180 }} allowClear />
          </Space>
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button onClick={handleLoad}>加载待处理</Button>
              <Button type="primary" loading={submitting} disabled={!canView} onClick={handleRun}>开始审查</Button>
            </Space>
          </div>
          {!canView && <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 med_review:view 权限）</Text>}
        </Card>

        <Card title="审查结果" size="small">
          <Spin spinning={loading}>
            {reviews.length === 0 ? (
              <Empty description="暂无审查记录，输入药品后点击「开始审查」" />
            ) : (
              <Table rowKey="id" size="small" pagination={false} dataSource={reviews} columns={columns} />
            )}
          </Spin>
        </Card>

        <Modal
          title="用药审查豁免"
          open={!!overrideTarget}
          onCancel={() => setOverrideTarget(null)}
          okText="确认豁免"
          cancelText="取消"
          onOk={async () => {
            if (!overrideTarget) return;
            if (!overrideReason.trim()) { message.warning('请填写豁免原因'); return; }
            await override(overrideTarget.id, overrideReason.trim());
            setOverrideTarget(null);
            if (visitId) await load(visitId);
            message.success('已登记豁免');
          }}
        >
          {overrideTarget && (
            <>
              <Text type="secondary">药品：{overrideTarget.drugName} ｜ 提醒：{overrideTarget.message}</Text>
              <Input.TextArea
                rows={3} style={{ marginTop: 8 }} placeholder="请填写豁免原因（必填）"
                value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              />
            </>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}
