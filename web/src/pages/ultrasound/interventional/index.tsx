/**
 * 健澜科技 jlmedaios - 超声介入管理（M811）
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
import { useUltrasoundInterventionalM811Store } from '@/store/ultrasoundInterventionalM811Store';
import type { UltrasoundInterventionalCase } from '@/services/api/ultrasoundInterventionalM811';

const buildColumns = (setDetail: (r: UltrasoundInterventionalCase) => void): ColumnsType<UltrasoundInterventionalCase> => [
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '操作名称', dataIndex: 'procedure', width: 280, ellipsis: true },
  { title: '入路', dataIndex: 'access', width: 180, ellipsis: true },
  { title: '病理结果', dataIndex: 'pathology', width: 220, ellipsis: true },
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

export default function UltrasoundInterventionalM811Page() {
  usePageTitle('超声介入管理');
  const { items, loading, error, demo, load } = useUltrasoundInterventionalM811Store();
  const [detail, setDetail] = useState<UltrasoundInterventionalCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="超声介入管理"
      description="患者姓名 / 操作名称 / 入路 / 病理结果 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`超声介入（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="超声介入详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="操作名称" span={2}>{detail.procedure}</Descriptions.Item>
              <Descriptions.Item label="入路" span={2}>{detail.access}</Descriptions.Item>
              <Descriptions.Item label="术前评估" span={2}>{detail.preOp}</Descriptions.Item>
              <Descriptions.Item label="操作记录" span={2}>{detail.record}</Descriptions.Item>
              <Descriptions.Item label="病理结果" span={2}>{detail.pathologyResult}</Descriptions.Item>
              <Descriptions.Item label="并发症记录" span={2}>{detail.complications}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
