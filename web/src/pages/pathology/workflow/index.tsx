/**
 * 健澜科技 jlmedaios - 病理科工作流程（M690）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePathologyWorkflowM690Store } from '@/store/pathologyWorkflowM690Store';
import {
  SPECIMEN_STAGE_META,
  type PathologySpecimen,
} from '@/services/api/pathologyWorkflowM690';

const buildColumns = (setDetail: (r: PathologySpecimen) => void): ColumnsType<PathologySpecimen> => [
  { title: '标本号', dataIndex: 'specimenNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '部位', dataIndex: 'bodyPart', width: 140 },
  {
    title: '流转状态',
    dataIndex: 'stage',
    width: 120,
    render: (v: PathologySpecimen['stage']) => <Tag color={SPECIMEN_STAGE_META[v].color}>{SPECIMEN_STAGE_META[v].label}</Tag>,
  },
  { title: '接收时间', dataIndex: 'receivedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '取材技师', dataIndex: 'grossedBy', width: 110 },
  { title: '切片技师', dataIndex: 'sectionedBy', width: 110 },
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

export default function PathologyWorkflowM690Page() {
  usePageTitle('病理科工作流程');
  const { items, loading, error, demo, load } = usePathologyWorkflowM690Store();
  const [detail, setDetail] = useState<PathologySpecimen | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病理科工作流程"
      description="标本号 / 部位 / 接收 / 取材 / 切片 / 报告状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`标本流转（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="标本流转详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标本号">{detail.specimenNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="部位">{detail.bodyPart}</Descriptions.Item>
            <Descriptions.Item label="流转状态">
              <Tag color={SPECIMEN_STAGE_META[detail.stage].color}>{SPECIMEN_STAGE_META[detail.stage].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="接收时间">
              {dayjs(detail.receivedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="取材技师">{detail.grossedBy}</Descriptions.Item>
            <Descriptions.Item label="切片技师">{detail.sectionedBy}</Descriptions.Item>
            <Descriptions.Item label="报告时间">
              {detail.reportedAt ? dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
