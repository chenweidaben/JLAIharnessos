/**
 * 健澜科技 jlmedaios - 出院计划（M666，配套 M561）
 *
 * 三甲流程：计划 Table（患者/病区/预估出院日期/随访安排）+ 详情 Modal。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDischargePlanningV2M666Store } from '@/store/dischargePlanningV2M666Store';
import {
  PLAN_STATUS_META,
  type DischargePlan,
} from '@/services/api/dischargePlanningV2M666';

const buildColumns = (setDetail: (row: DischargePlan) => void): ColumnsType<DischargePlan> => [
  { title: '计划号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '病区', dataIndex: 'ward', width: 130 },
  { title: '预估出院日期', dataIndex: 'estimatedDischargeDate', width: 140 },
  {
    title: '随访安排',
    dataIndex: 'followupItems',
    ellipsis: true,
    render: (items: string[]) => items.join('；'),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: DischargePlan['status']) => (
      <Tag color={PLAN_STATUS_META[v].color}>{PLAN_STATUS_META[v].label}</Tag>
    ),
  },
  { title: '个案管理师', dataIndex: 'caseManager', width: 110 },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function DischargePlanningV2M666Page() {
  usePageTitle('出院计划');

  const { items, loading, error, demo, load } = useDischargePlanningV2M666Store();

  const [detail, setDetail] = useState<DischargePlan | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="出院计划（v2）"
      description="患者 / 出院预估日期 / 随访安排"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`出院计划（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="出院计划详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="计划号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="病区">{detail.ward}</Descriptions.Item>
            <Descriptions.Item label="预估出院日期">{detail.estimatedDischargeDate}</Descriptions.Item>
            <Descriptions.Item label="随访安排">
              {detail.followupItems.map((f, i) => (
                <div key={i}>· {f}</div>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="居家护理">{detail.homeCare}</Descriptions.Item>
            <Descriptions.Item label="用药指导">{detail.medicationGuidance}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={PLAN_STATUS_META[detail.status].color}>{PLAN_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="个案管理师">{detail.caseManager}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
