/**
 * 健澜科技 jlmedaios - 医疗技术准入管理（M711）
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
import { useTechAdmissionM711Store } from '@/store/techAdmissionM711Store';
import {
  TECH_LEVEL_META,
  TECH_STATUS_META,
  type TechAdmission,
} from '@/services/api/techAdmissionM711';

const buildColumns = (setDetail: (r: TechAdmission) => void): ColumnsType<TechAdmission> => [
  { title: '技术名称', dataIndex: 'name', ellipsis: true },
  { title: '类别', dataIndex: 'category', width: 160 },
  {
    title: '级别',
    dataIndex: 'level',
    width: 90,
    render: (v: TechAdmission['level']) => <Tag color={TECH_LEVEL_META[v].color}>{TECH_LEVEL_META[v].label}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: TechAdmission['status']) => <Tag color={TECH_STATUS_META[v].color}>{TECH_STATUS_META[v].label}</Tag>,
  },
  {
    title: '准入日期',
    dataIndex: 'admittedAt',
    width: 120,
    render: (v: string | null) => v ?? '—',
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

export default function TechAdmissionM711Page() {
  usePageTitle('医疗技术准入管理');
  const { items, loading, error, demo, load } = useTechAdmissionM711Store();
  const [detail, setDetail] = useState<TechAdmission | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗技术准入管理"
      description="技术名称 / 类别 / 级别 / 状态 / 准入日期"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`技术目录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医疗技术准入详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="技术名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="类别">{detail.category}</Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={TECH_LEVEL_META[detail.level].color}>{TECH_LEVEL_META[detail.level].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={TECH_STATUS_META[detail.status].color}>{TECH_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="技术说明">{detail.description}</Descriptions.Item>
            <Descriptions.Item label="操作人员资质">{detail.operatorQualification}</Descriptions.Item>
            <Descriptions.Item label="设备要求">{detail.equipment}</Descriptions.Item>
            <Descriptions.Item label="伦理审查">{detail.ethicsReview}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
