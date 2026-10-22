/**
 * 健澜科技 jlmedaios - 医院评审管理（M758）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useHospitalReviewM758Store } from '@/store/hospitalReviewM758Store';
import {
  REVIEW_STATUS_META,
  type HospitalReview,
} from '@/services/api/hospitalReviewM758';

const clauseColumns: ColumnsType<{ code: string; name: string; score: number }> = [
  { title: '条款编码', dataIndex: 'code', width: 120 },
  { title: '条款名称', dataIndex: 'name' },
  { title: '得分', dataIndex: 'score', align: 'right', width: 100 },
];

const buildColumns = (setDetail: (r: HospitalReview) => void): ColumnsType<HospitalReview> => [
  { title: '评审名称', dataIndex: 'name', ellipsis: true },
  { title: '评审年度', dataIndex: 'year', width: 110 },
  { title: '评审等级', dataIndex: 'level', width: 110 },
  {
    title: '评审状态',
    dataIndex: 'status',
    width: 140,
    render: (v: HospitalReview['status']) => <Tag color={REVIEW_STATUS_META[v].color}>{REVIEW_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function HospitalReviewM758Page() {
  usePageTitle('医院评审管理');
  const { items, loading, error, demo, load } = useHospitalReviewM758Store();
  const [detail, setDetail] = useState<HospitalReview | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医院评审管理"
      description="评审名称 / 评审年度 / 评审等级 / 评审状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`评审任务（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="评审任务详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="评审名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="评审年度">{detail.year}</Descriptions.Item>
              <Descriptions.Item label="评审等级">{detail.level}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={REVIEW_STATUS_META[detail.status].color}>{REVIEW_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="自评结果" span={2}>{detail.selfResult}</Descriptions.Item>
              <Descriptions.Item label="整改记录" span={2}>{detail.rectifications}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="评审条款分解">
              <Table rowKey="code" dataSource={detail.clauses} columns={clauseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
