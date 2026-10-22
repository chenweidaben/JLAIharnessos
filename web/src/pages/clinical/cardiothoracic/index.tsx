/**
 * 健澜科技 jlmedaios - 心胸外科管理（M794）
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
import { useCtSurgPatientM794Store } from '@/store/ctSurgPatientM794Store';
import type { CtSurgPatient } from '@/services/api/ctSurgPatientM794';

const buildColumns = (setDetail: (r: CtSurgPatient) => void): ColumnsType<CtSurgPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  { title: '手术名称', dataIndex: 'surgery', width: 260, ellipsis: true },
  { title: '体外循环', dataIndex: 'ecmo', width: 220, ellipsis: true },
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

export default function CardiothoracicM794Page() {
  usePageTitle('心胸外科管理');
  const { items, loading, error, demo, load } = useCtSurgPatientM794Store();
  const [detail, setDetail] = useState<CtSurgPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心胸外科管理"
      description="住院号 / 患者姓名 / 诊断 / 手术名称 / 体外循环 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心胸患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心胸患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="手术名称" span={2}>{detail.surgery}</Descriptions.Item>
              <Descriptions.Item label="体外循环" span={2}>{detail.ecmo}</Descriptions.Item>
              <Descriptions.Item label="术前心功能评估" span={2}>{detail.preOp}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="术后监护" span={2}>{detail.postOpIcu}</Descriptions.Item>
              <Descriptions.Item label="胸腔引流" span={2}>{detail.chestDrain}</Descriptions.Item>
              <Descriptions.Item label="康复计划" span={2}>{detail.rehab}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
