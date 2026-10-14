/**
 * 健澜科技 jlmedaios - 处方点评页
 *
 * 待点评处方列表 + 点评表单（合理 / 不合理 / 超常 + 意见）+ 结果统计卡。
 * 定位：CDS 实时审查之后的药师人工事后点评闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Form, Input, Layout, Modal, Radio, Row, Statistic, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { usePrescriptionReviewStore } from '@/store/prescriptionReviewStore';
import {
  RESULT_LABEL,
  type PendingPrescription,
  type PrescriptionReview,
  type ReviewResult,
} from '@/services/api/prescriptionReview';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 结论配色：合理绿 / 不合理红 / 超常橙 */
const RESULT_TAG: Record<ReviewResult, { color: string; label: string }> = {
  rational: { color: 'green', label: RESULT_LABEL.rational },
  irrational: { color: 'red', label: RESULT_LABEL.irrational },
  abnormal: { color: 'orange', label: RESULT_LABEL.abnormal },
};

export default function PrescriptionReviewPage() {
  const { pending, recent, stats, loading, submitting, error, load, submit } = usePrescriptionReviewStore();
  const [active, setActive] = useState<PendingPrescription | null>(null);
  const [result, setResult] = useState<ReviewResult>('rational');
  const [comment, setComment] = useState('');

  useEffect(() => { void load(); }, [load]);

  const openReview = (row: PendingPrescription) => {
    setActive(row);
    setResult('rational');
    setComment('');
  };

  const handleSubmit = async () => {
    if (!active) return;
    await submit({ prescriptionId: active.prescriptionId, result, comment: comment.trim() || undefined });
    const err = usePrescriptionReviewStore.getState().error;
    if (err) { message.error(err); return; }
    message.success(`已点评处方 ${active.rxNo}：${RESULT_LABEL[result]}`);
    setActive(null);
  };

  const pendingColumns: ColumnsType<PendingPrescription> = [
    { title: '处方号', dataIndex: 'rxNo', key: 'rxNo' },
    { title: '就诊号', dataIndex: 'visitId', key: 'visitId' },
    {
      title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel',
      render: (v: string | null) => (v ? <Tag color="volcano">{v}</Tag> : <Tag>常规</Tag>),
    },
    { title: '开立时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
    {
      title: '操作', key: 'action',
      render: (_: unknown, row: PendingPrescription) => (
        <Button type="link" size="small" onClick={() => openReview(row)}>点评</Button>
      ),
    },
  ];

  const recentColumns: ColumnsType<PrescriptionReview> = [
    { title: '处方 ID', dataIndex: 'prescriptionId', key: 'prescriptionId', ellipsis: true },
    {
      title: '结论', dataIndex: 'result', key: 'result',
      render: (v: ReviewResult) => {
        const t = RESULT_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    { title: '点评意见', dataIndex: 'comment', key: 'comment', ellipsis: true, render: (v: string | null) => v ?? '—' },
    { title: '点评时间', dataIndex: 'reviewedAt', key: 'reviewedAt', render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>处方点评</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card><Statistic title="待点评处方" value={stats?.pending ?? pending.length} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="已点评总数" value={stats?.total ?? '-'} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="合理" value={stats?.rational ?? 0} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="不合理" value={stats?.irrational ?? 0} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="超常" value={stats?.abnormal ?? 0} valueStyle={{ color: '#d46b08' }} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="合理率" value={stats ? `${stats.rationalRate}%` : '-'} /></Card>
          </Col>
        </Row>

        <Card title="待点评处方" style={{ marginBottom: 16 }}>
          <Table
            rowKey="prescriptionId" size="small" loading={loading}
            columns={pendingColumns} dataSource={pending} pagination={false}
            locale={{ emptyText: <Empty description="暂无待点评处方" /> }}
          />
        </Card>

        <Card title="最近点评记录">
          <Table
            rowKey="id" size="small" loading={loading}
            columns={recentColumns} dataSource={recent} pagination={false}
            locale={{ emptyText: <Empty description="暂无点评记录" /> }}
          />
        </Card>

        <Modal
          title={`点评处方 ${active?.rxNo ?? ''}`}
          open={!!active}
          onCancel={() => setActive(null)}
          onOk={() => void handleSubmit()}
          confirmLoading={submitting}
          okText="提交点评"
        >
          <Form layout="vertical">
            <Form.Item label="点评结论" required>
              <Radio.Group
                value={result}
                onChange={(e) => setResult(e.target.value as ReviewResult)}
                options={(Object.keys(RESULT_LABEL) as ReviewResult[]).map((k) => ({
                  value: k, label: RESULT_LABEL[k],
                }))}
              />
            </Form.Item>
            <Form.Item label="点评意见（可选）">
              <Input.TextArea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} showCount />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
