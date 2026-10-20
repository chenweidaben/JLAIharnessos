/**
 * 健澜科技 jlmedaios - 处方点评管理看板（M502）
 * 路由：/pharmacy/prescription-review-board
 * 顶部 KPI：本月点评处方数 / 处方合理率 / 不合理处方数 / 重点监控药品处方占比
 * 点评记录 / 问题反馈 / 处方统计
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { FeedbackRow, ReviewRow } from '@/services/api/prescriptionReviewBoard';
import { usePrescriptionReviewBoardStore } from '@/store/prescriptionReviewBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const RX_TYPE: Record<string, { color: string; label: string }> = {
  ordinary: { color: 'blue', label: '普通处方' },
  emergency: { color: 'orange', label: '急诊处方' },
  pediatric: { color: 'green', label: '儿科处方' },
  anesthesia: { color: 'red', label: '麻醉处方' },
};

const REVIEW_RESULT: Record<string, { color: string; label: string }> = {
  rational: { color: 'green', label: '合理' },
  irrational: { color: 'red', label: '不合理' },
  inappropriate: { color: 'orange', label: '用药不适宜' },
};

const ISSUE: Record<string, { color: string; label: string }> = {
  indication: { color: 'red', label: '适应症不适宜' },
  drugChoice: { color: 'orange', label: '遴选药品不适宜' },
  dosage: { color: 'blue', label: '用法用量不适宜' },
  combination: { color: 'purple', label: '联合用药不适宜' },
};

const REVIEW_COLUMNS: ColumnsType<ReviewRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '医师', dataIndex: 'doctor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '处方类型',
    dataIndex: 'rxType',
    render: (v: string) => {
      const m = RX_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '点评结果',
    dataIndex: 'result',
    render: (v: string) => {
      const m = REVIEW_RESULT[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const FEEDBACK_COLUMNS: ColumnsType<FeedbackRow> = [
  {
    title: '问题类型',
    dataIndex: 'issue',
    render: (v: string) => {
      const m = ISSUE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '整改要求', dataIndex: 'requirement', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '反馈时间', dataIndex: 'feedbackAt' },
];

export default function PrescriptionReviewBoardM502Page() {
  usePageTitle('处方点评管理看板');
  const { reviews, feedback, stats, loading, error, demo, load } = usePrescriptionReviewBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && reviews.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载处方点评看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="处方点评管理看板（药事 P0 合规重点）"
      description="点评记录 / 问题反馈 / 处方统计 一屏总览"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /prescription/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月点评处方"
              value={stats?.totalReviewed ?? reviews.length}
              suffix="张"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.rationalRate ?? 0) >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="处方合理率"
              value={stats?.rationalRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: (stats?.rationalRate ?? 0) >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.irrationalCount ?? 0) > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="不合理处方"
              value={stats?.irrationalCount ?? 0}
              suffix="张"
              valueStyle={{ color: (stats?.irrationalCount ?? 0) > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="重点监控药品处方占比"
              value={stats?.keyDrugRatio ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>点评记录</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={REVIEW_COLUMNS} dataSource={reviews} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>问题反馈</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={FEEDBACK_COLUMNS} dataSource={feedback} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
