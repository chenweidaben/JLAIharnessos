/**
 * 健澜科技 jlmedaios - 病历质控看板（M473）
 *
 * 路由：/quality/emr-quality-board
 * 顶部 KPI：甲级率 / 乙级率 / 丙级率 / 缺陷条数
 * 中部：缺陷类型分布 Table
 * 底部：科室病历质量排名 Table
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type {
  DeptRankingRow,
  DefectTypeRow,
  EmrDefectRow,
} from '@/services/api/emrQuality';
import { useEmrQualityStore } from '@/store/emrQualityStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

const SEVERITY_META: Record<EmrDefectRow['severity'], { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
};

const DEFECT_COLUMNS: ColumnsType<EmrDefectRow> = [
  { title: '病历号', dataIndex: 'recordNo' },
  { title: '患者', dataIndex: 'patient' },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '主治医生', dataIndex: 'doctor' },
  { title: '缺陷类型', dataIndex: 'defectType' },
  {
    title: '严重度',
    dataIndex: 'severity',
    render: (v: EmrDefectRow['severity']) => {
      const m = SEVERITY_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发现时间', dataIndex: 'foundAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: EmrDefectRow['status']) => (
      <Tag color={v === 'fixed' ? 'success' : v === 'pending' ? 'processing' : 'default'}>
        {v === 'fixed' ? '已整改' : v === 'pending' ? '待整改' : '已豁免'}
      </Tag>
    ),
  },
];

const TYPE_COLUMNS: ColumnsType<DefectTypeRow> = [
  { title: '缺陷类型', dataIndex: 'type' },
  { title: '条数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  {
    title: '占比',
    dataIndex: 'percent',
    render: (v: number) => (
      <div className="flex items-center gap-2">
        <Progress percent={v} size="small" style={{ width: 120 }} strokeColor={JL.accent} />
        <Text type="secondary" style={{ fontSize: 12 }}>{v.toFixed(1)}%</Text>
      </div>
    ),
    sorter: (a, b) => b.percent - a.percent,
  },
];

const RANKING_COLUMNS: ColumnsType<DeptRankingRow> = [
  {
    title: '排名',
    dataIndex: 'rank',
    render: (v: number) => {
      const colors = ['#cf1322', '#d46b08', '#d4b106'];
      const color = v <= 3 ? colors[v - 1] : '#999';
      return <Tag color={color}>#{v}</Tag>;
    },
    sorter: (a, b) => a.rank - b.rank,
  },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '在架病历数', dataIndex: 'total' },
  { title: '甲级数', dataIndex: 'gradeA' },
  {
    title: '甲级率',
    dataIndex: 'gradeARate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 120 }}
        strokeColor={v >= 95 ? '#389e0d' : v >= 90 ? JL.blue : '#cf1322'}
      />
    ),
    sorter: (a, b) => b.gradeARate - a.gradeARate,
  },
  {
    title: '缺陷条数',
    dataIndex: 'defectCount',
    render: (v: number) => (
      <Text strong style={{ color: v > 8 ? '#cf1322' : JL.navy }}>{v}</Text>
    ),
    sorter: (a, b) => b.defectCount - a.defectCount,
  },
];

export default function EmrQualityBoardM473Page() {
  usePageTitle('病历质控看板');
  const { defects, gradeRate, defectTypes, deptRanking, loading, error, demo, load } =
    useEmrQualityStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && defects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载病历质控看板…" />
      </div>
    );
  }

  const gradeA = gradeRate.find((g) => g.grade === '甲')?.rate ?? 0;
  const gradeB = gradeRate.find((g) => g.grade === '乙')?.rate ?? 0;
  const gradeC = gradeRate.find((g) => g.grade === '丙')?.rate ?? 0;

  return (
    <PageContainer
      title="病历质控看板"
      description="终末质控：甲/乙/丙级率 + 缺陷类型分布 + 科室排名"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /emr-quality/* 接入后自动切换为真实指标）"
        />
      )}

      {/* 顶部 KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid #389e0d` }}>
            <Statistic
              title="甲级率"
              value={gradeA}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="乙级率"
              value={gradeB}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid #cf1322` }}>
            <Statistic
              title="丙级率"
              value={gradeC}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic
              title="待整改缺陷"
              value={defects.filter((d) => d.status === 'pending').length}
              suffix={`/ ${defects.length}`}
              valueStyle={{ color: JL.navy }}
            />
          </Card>
        </Col>
      </Row>

      {/* 缺陷清单 */}
      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>最新缺陷病历</span>}
        style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={DEFECT_COLUMNS}
          dataSource={defects}
          pagination={false}
          size="middle"
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>缺陷类型分布</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table
              rowKey="id"
              columns={TYPE_COLUMNS}
              dataSource={defectTypes}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>科室病历质量排名</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table
              rowKey="id"
              columns={RANKING_COLUMNS}
              dataSource={deptRanking}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
