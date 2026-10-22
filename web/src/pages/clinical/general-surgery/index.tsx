/**
 * 健澜科技 jlmedaios - 普外科管理（M793）
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
import { useGenSurgPatientM793Store } from '@/store/genSurgPatientM793Store';
import type { GenSurgPatient } from '@/services/api/genSurgPatientM793';

const buildColumns = (setDetail: (r: GenSurgPatient) => void): ColumnsType<GenSurgPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '手术名称', dataIndex: 'surgery', width: 240, ellipsis: true },
  { title: '手术日期', dataIndex: 'surgeryDate', width: 120 },
  { title: '状态', dataIndex: 'status', width: 130 },
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

export default function GeneralSurgeryM793Page() {
  usePageTitle('普外科管理');
  const { items, loading, error, demo, load } = useGenSurgPatientM793Store();
  const [detail, setDetail] = useState<GenSurgPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="普外科管理"
      description="住院号 / 患者姓名 / 诊断 / 手术名称 / 手术日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`普外患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="普外患者详情"
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
              <Descriptions.Item label="手术名称">{detail.surgery}</Descriptions.Item>
              <Descriptions.Item label="手术日期">{detail.surgeryDate}</Descriptions.Item>
              <Descriptions.Item label="术前评估" span={2}>{detail.preOp}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.opRecord}</Descriptions.Item>
              <Descriptions.Item label="术后恢复" span={2}>{detail.postOp}</Descriptions.Item>
              <Descriptions.Item label="引流管管理" span={2}>{detail.drainage}</Descriptions.Item>
              <Descriptions.Item label="出院指导" span={2}>{detail.discharge}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
