/**
 * 健澜科技 jlmedaios - 介入放射科管理（M802）
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
import { useIrCaseM802Store } from '@/store/irCaseM802Store';
import type { IrCase } from '@/services/api/irCaseM802';

const buildColumns = (setDetail: (r: IrCase) => void): ColumnsType<IrCase> => [
  { title: '手术编号', dataIndex: 'opNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '手术名称', dataIndex: 'opName', width: 240, ellipsis: true },
  { title: '入路', dataIndex: 'access', width: 200, ellipsis: true },
  { title: '造影结果', dataIndex: 'angiography', width: 240, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 120 },
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

export default function InterventionalRadiologyM802Page() {
  usePageTitle('介入放射科管理');
  const { items, loading, error, demo, load } = useIrCaseM802Store();
  const [detail, setDetail] = useState<IrCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="介入放射科管理"
      description="手术编号 / 患者姓名 / 手术名称 / 入路 / 造影结果 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`介入手术（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="介入手术详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="手术编号">{detail.opNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="手术名称" span={2}>{detail.opName}</Descriptions.Item>
              <Descriptions.Item label="入路">{detail.access}</Descriptions.Item>
              <Descriptions.Item label="造影结果" span={2}>{detail.angiography}</Descriptions.Item>
              <Descriptions.Item label="术前评估" span={2}>{detail.preOp}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="造影图像描述" span={2}>{detail.angioFindings}</Descriptions.Item>
              <Descriptions.Item label="术后并发症" span={2}>{detail.complications}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
