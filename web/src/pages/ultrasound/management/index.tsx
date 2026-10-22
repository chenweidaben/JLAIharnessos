/**
 * 健澜科技 jlmedaios - 超声科管理（M870 原地升级 M840 视图）
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
import { useUltrasoundWorkloadM870Store } from '@/store/ultrasoundWorkloadM870Store';
import type { UltrasoundWorkloadM870 } from '@/services/api/ultrasoundWorkloadM870';

const categoryColumns: ColumnsType<{ name: string; count: number; positive: number }> = [
  { title: '检查项目', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '阳性数', dataIndex: 'positive', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const buildColumns = (setDetail: (r: UltrasoundWorkloadM870) => void): ColumnsType<UltrasoundWorkloadM870> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '腹部超声数', dataIndex: 'abdomen', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '心血管超声数', dataIndex: 'cardiovascular', width: 150, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '妇产超声数', dataIndex: 'obstetricsGynecology', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '介入超声数', dataIndex: 'interventional', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function UltrasoundManagementM870Page() {
  usePageTitle('超声科管理');
  const { items, loading, error, demo, load } = useUltrasoundWorkloadM870Store();
  const [detail, setDetail] = useState<UltrasoundWorkloadM870 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="超声科管理"
      description="日期 / 腹部超声数 / 心血管超声数 / 妇产超声数 / 介入超声数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`超声科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="超声科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="腹部超声数">{detail.abdomen}</Descriptions.Item>
              <Descriptions.Item label="心血管超声数">{detail.cardiovascular}</Descriptions.Item>
              <Descriptions.Item label="妇产超声数">{detail.obstetricsGynecology}</Descriptions.Item>
              <Descriptions.Item label="介入超声数">{detail.interventional}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="急诊超声（床旁超声 POCUS）" span={2}>{detail.statBedside}</Descriptions.Item>
              <Descriptions.Item label="超声引导下穿刺记录" span={2}>{detail.biopsyRecords}</Descriptions.Item>
              <Descriptions.Item label="报告阳性率" span={2}>{detail.positivity}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查项目分类（腹部/心血管/妇产/浅表/介入）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={categoryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
