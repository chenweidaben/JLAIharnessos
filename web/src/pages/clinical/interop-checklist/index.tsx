/**
 * 健澜科技 jlmedaios - 互联互通四甲测评清单（M657，配套 M585）
 *
 * 三甲流程：KPI 进度卡 + 测评项 Table（考核项/得分/状态 badge/证据材料）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useInteropChecklistM657Store } from '@/store/interopChecklistM657Store';
import {
  CHECK_STATUS_META,
  type InteropCheckItem,
} from '@/services/api/interopChecklistM657';

const columns: ColumnsType<InteropCheckItem> = [
  { title: '编号', dataIndex: 'id', width: 100 },
  { title: '类别', dataIndex: 'category', width: 130 },
  { title: '考核项', dataIndex: 'item', ellipsis: true },
  {
    title: '得分',
    dataIndex: 'score',
    width: 220,
    render: (_v, row) => (
      <Progress
        percent={Math.round((row.score / row.maxScore) * 100)}
        size="small"
        format={() => `${row.score}/${row.maxScore}`}
        strokeColor={
          row.score / row.maxScore >= 0.9 ? '#3f8600' : row.score / row.maxScore >= 0.6 ? '#faad14' : '#cf1322'
        }
      />
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: InteropCheckItem['status']) => (
      <Tag color={CHECK_STATUS_META[v].color}>{CHECK_STATUS_META[v].label}</Tag>
    ),
  },
  { title: '证据材料', dataIndex: 'evidence', ellipsis: true },
];

export default function InteropChecklistPage() {
  usePageTitle('互联互通测评清单');

  const { items, totalScore, maxScore, loading, error, demo, load } =
    useInteropChecklistM657Store();

  useEffect(() => {
    void load();
  }, [load]);

  const passCount = items.filter((i) => i.status === 'passed').length;
  const partialCount = items.filter((i) => i.status === 'partial').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <PageContainer
      title="互联互通四甲测评清单"
      description="考核项 / 分值 / 达标状态 / 证据材料"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="累计得分" value={totalScore} suffix={`/ ${maxScore}`} />
            <Progress percent={pct} strokeColor={pct >= 90 ? '#3f8600' : pct >= 75 ? '#faad14' : '#cf1322'} />
          </Card>
        </Col>
        <Col span={16}>
          <Card size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="达标项" value={passCount} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={8}>
                <Statistic title="部分达标" value={partialCount} valueStyle={{ color: '#faad14' }} />
              </Col>
              <Col span={8}>
                <Statistic title="待测评" value={pendingCount} valueStyle={{ color: '#999' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`测评项（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
