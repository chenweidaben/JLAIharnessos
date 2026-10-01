/**
 * 健澜科技 jlmedaios - 满意度统计面板（M3-O）
 *
 * 医护/管理查看满意度统计（平均分、各维度、好评率）与评价列表。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Progress,
  Radio,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useSatisfactionStore } from '@/store/satisfactionStore';
import type {
  SatisfactionSource,
  SatisfactionSurvey,
} from '@/types/satisfaction';

const SOURCE_LABEL: Record<SatisfactionSource, string> = {
  outpatient: '门诊',
  inpatient: '住院',
  consultation: '互联网问诊',
};

function scoreColor(avg: number) {
  if (avg >= 4.5) return '#3f8600';
  if (avg >= 3.5) return '#faad14';
  return '#cf1322';
}

export default function SatisfactionStatsPanel() {
  const { stats, allSurveys, loadStats, loadAll, loading } = useSatisfactionStore();
  const [source, setSource] = useState<SatisfactionSource | 'all'>('all');

  useEffect(() => {
    void loadStats(source === 'all' ? undefined : source);
    void loadAll(source === 'all' ? {} : { sourceType: source });
  }, [source, loadStats, loadAll]);

  const dimensionRows = useMemo(() => {
    if (!stats) return [];
    const dims: { label: string; avg: number }[] = [
      { label: '总体满意度', avg: stats.overallAvg },
      { label: '医疗质量', avg: stats.medicalAvg },
      { label: '服务态度', avg: stats.serviceAvg },
      { label: '就医环境', avg: stats.environmentAvg },
      { label: '就诊流程', avg: stats.processAvg },
      { label: '等候时间', avg: stats.waitAvg },
    ];
    return dims;
  }, [stats]);

  const columns = [
    { title: '评价编号', dataIndex: 'surveyNo', key: 'surveyNo' },
    {
      title: '来源',
      dataIndex: 'sourceType',
      key: 'sourceType',
      render: (t: SatisfactionSource) => <Tag>{SOURCE_LABEL[t]}</Tag>,
    },
    {
      title: '总体',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (n: number) => <Tag color={n >= 4 ? 'green' : n === 3 ? 'orange' : 'red'}>{n} 分</Tag>,
    },
    { title: '意见', dataIndex: 'comment', key: 'comment', render: (c: string | null) => c ?? '—' },
    {
      title: '评价时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div data-testid="satisfaction-stats-panel">
      <Card
        title="满意度统计"
        extra={
          <Radio.Group
            value={source}
            onChange={(e) => setSource(e.target.value as SatisfactionSource | 'all')}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button value="outpatient">门诊</Radio.Button>
            <Radio.Button value="inpatient">住院</Radio.Button>
            <Radio.Button value="consultation">互联网问诊</Radio.Button>
          </Radio.Group>
        }
        loading={loading}
      >
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Statistic
              title="评价总数"
              value={stats?.total ?? 0}
              data-testid="stat-total"
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="平均满意度"
              value={stats?.overallAvg ?? 0}
              precision={2}
              valueStyle={{ color: scoreColor(stats?.overallAvg ?? 0) }}
              suffix="/ 5"
              data-testid="stat-overall"
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="好评率"
              value={stats?.positiveRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
              data-testid="stat-positive"
            />
          </Col>
          <Col xs={12} md={6}>
            <div style={{ paddingTop: 8 }}>
              <Typography.Text type="secondary">好评率（≥4 星）</Typography.Text>
              <Progress
                percent={stats?.positiveRate ?? 0}
                strokeColor="#3f8600"
                size="small"
              />
            </div>
          </Col>
        </Row>

        <Table
          style={{ marginTop: 16 }}
          rowKey="label"
          pagination={false}
          dataSource={dimensionRows}
          columns={[
            { title: '评价维度', dataIndex: 'label', key: 'label' },
            {
              title: '平均分',
              dataIndex: 'avg',
              key: 'avg',
              render: (n: number) => (
                <Typography.Text style={{ color: scoreColor(n) }} strong>
                  {n.toFixed(2)}
                </Typography.Text>
              ),
            },
            {
              title: '占比',
              dataIndex: 'avg',
              key: 'bar',
              render: (n: number) => (
                <Progress percent={Math.round((n / 5) * 100)} size="small" />
              ),
            },
          ]}
        />
      </Card>

      <Card title="评价明细" style={{ marginTop: 16 }}>
        <Table<SatisfactionSurvey>
          rowKey="id"
          loading={loading}
          dataSource={allSurveys}
          columns={columns}
          pagination={{ pageSize: 10 }}
          data-testid="survey-table"
        />
      </Card>
    </div>
  );
}
