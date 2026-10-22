/**
 * 健澜科技 jlmedaios - 心理科管理（M827）
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
import { usePsychologyWorkloadM827Store } from '@/store/psychologyWorkloadM827Store';
import type { PsychologyWorkload } from '@/services/api/psychologyWorkloadM827';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '咨询类型', dataIndex: 'name' },
  { title: '例数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PsychologyWorkload) => void): ColumnsType<PsychologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '咨询人次', dataIndex: 'counseling', width: 100, align: 'right' },
  { title: '抑郁筛查', dataIndex: 'depressionScreen', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '焦虑筛查', dataIndex: 'anxietyScreen', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '心理治疗数', dataIndex: 'psychotherapy', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function PsychologyManagementM827Page() {
  usePageTitle('心理科管理');
  const { items, loading, error, demo, load } = usePsychologyWorkloadM827Store();
  const [detail, setDetail] = useState<PsychologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心理科管理"
      description="日期 / 咨询人次 / 抑郁筛查 / 焦虑筛查 / 心理治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心理科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心理科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="咨询人次">{detail.counseling}</Descriptions.Item>
              <Descriptions.Item label="抑郁筛查">{detail.depressionScreen}</Descriptions.Item>
              <Descriptions.Item label="焦虑筛查">{detail.anxietyScreen}</Descriptions.Item>
              <Descriptions.Item label="心理治疗数">{detail.psychotherapy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="PHQ-9/GAD-7 评分" span={2}>{detail.scores}</Descriptions.Item>
              <Descriptions.Item label="心理治疗记录" span={2}>{detail.therapyRecords}</Descriptions.Item>
              <Descriptions.Item label="MECT 记录" span={2}>{detail.mect}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="咨询类型分解">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
