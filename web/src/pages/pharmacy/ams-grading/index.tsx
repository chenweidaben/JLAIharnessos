/**
 * 健澜科技 jlmedaios - 抗菌药物分级管理（M716）
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
import { useAmsGradeM716Store } from '@/store/amsGradeM716Store';
import {
  AMS_GRADE_META,
  type AmsGradeItem,
} from '@/services/api/amsGradeM716';

const buildColumns = (setDetail: (r: AmsGradeItem) => void): ColumnsType<AmsGradeItem> => [
  { title: '药品名称', dataIndex: 'drugName', width: 160 },
  {
    title: '分级',
    dataIndex: 'grade',
    width: 140,
    render: (v: AmsGradeItem['grade']) => <Tag color={AMS_GRADE_META[v].color}>{AMS_GRADE_META[v].label}</Tag>,
  },
  { title: '限定使用科室', dataIndex: 'allowedDepts', width: 200, ellipsis: true },
  { title: '审批权限', dataIndex: 'approvalAuthority', ellipsis: true },
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

export default function AmsGradingM716Page() {
  usePageTitle('抗菌药物分级管理');
  const { items, loading, error, demo, load } = useAmsGradeM716Store();
  const [detail, setDetail] = useState<AmsGradeItem | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="抗菌药物分级管理"
      description="药品名称 / 分级 / 限定使用科室 / 审批权限"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`抗菌药物分级（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="抗菌药物分级详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="药品名称">{detail.drugName}</Descriptions.Item>
            <Descriptions.Item label="分级">
              <Tag color={AMS_GRADE_META[detail.grade].color}>{AMS_GRADE_META[detail.grade].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="限定使用科室">{detail.allowedDepts}</Descriptions.Item>
            <Descriptions.Item label="审批权限">{detail.approvalAuthority}</Descriptions.Item>
            <Descriptions.Item label="分级依据">{detail.basis}</Descriptions.Item>
            <Descriptions.Item label="使用限制">{detail.restriction}</Descriptions.Item>
            <Descriptions.Item label="审批流程">{detail.approvalProcess}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
