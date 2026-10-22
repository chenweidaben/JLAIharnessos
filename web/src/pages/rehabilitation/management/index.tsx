/**
 * 健澜科技 jlmedaios - 康复科管理（M846 原地升级 M816 视图）
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
import { useRehabilitationWorkloadM846Store } from '@/store/rehabilitationWorkloadM846Store';
import type { RehabilitationWorkloadM846 } from '@/services/api/rehabilitationWorkloadM846';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '治疗类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: RehabilitationWorkloadM846) => void): ColumnsType<RehabilitationWorkloadM846> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '康复评估数', dataIndex: 'assessments', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '物理治疗数', dataIndex: 'pt', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '作业治疗数', dataIndex: 'ot', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '言语治疗数', dataIndex: 'st', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function RehabilitationManagementM846Page() {
  usePageTitle('康复科管理');
  const { items, loading, error, demo, load } = useRehabilitationWorkloadM846Store();
  const [detail, setDetail] = useState<RehabilitationWorkloadM846 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="康复科管理"
      description="日期 / 康复评估数 / 物理治疗数 / 作业治疗数 / 言语治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`康复工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="康复工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="康复评估数">{detail.assessments}</Descriptions.Item>
              <Descriptions.Item label="物理治疗数">{detail.pt}</Descriptions.Item>
              <Descriptions.Item label="作业治疗数">{detail.ot}</Descriptions.Item>
              <Descriptions.Item label="言语治疗数">{detail.st}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="康复评估（FIM / Barthel / Fugl-Meyer）" span={2}>{detail.functionalScores}</Descriptions.Item>
              <Descriptions.Item label="治疗记录（ROM / 肌力 / 平衡）" span={2}>{detail.treatmentRecords}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.efficacy}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗类型分解（PT / OT / ST / 工程）">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
