/**
 * 健澜科技 jlmedaios - 小儿外科管理（M801）
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
import { usePedSurgPatientM801Store } from '@/store/pedSurgPatientM801Store';
import type { PedSurgPatient } from '@/services/api/pedSurgPatientM801';

const buildColumns = (setDetail: (r: PedSurgPatient) => void): ColumnsType<PedSurgPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患儿姓名', dataIndex: 'child', width: 120 },
  { title: '月龄', dataIndex: 'ageMonth', width: 90, align: 'right', render: (v: number) => `${v} 月` },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '手术方式', dataIndex: 'opApproach', width: 240, ellipsis: true },
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

export default function PediatricSurgeryM801Page() {
  usePageTitle('小儿外科管理');
  const { items, loading, error, demo, load } = usePedSurgPatientM801Store();
  const [detail, setDetail] = useState<PedSurgPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="小儿外科管理"
      description="住院号 / 患儿姓名 / 月龄 / 诊断 / 手术方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`小儿外科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="小儿外科患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患儿姓名">{detail.child}</Descriptions.Item>
              <Descriptions.Item label="月龄">{detail.ageMonth} 月</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="手术方式" span={2}>{detail.opApproach}</Descriptions.Item>
              <Descriptions.Item label="术前评估" span={2}>{detail.preOp}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="麻醉记录" span={2}>{detail.anesthesia}</Descriptions.Item>
              <Descriptions.Item label="术后监护" span={2}>{detail.postOp}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
