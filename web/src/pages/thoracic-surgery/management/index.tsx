/**
 * 健澜科技 jlmedaios - 胸外科管理（M866）
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
import { useThoracicSurgeryWorkloadM866Store } from '@/store/thoracicSurgeryWorkloadM866Store';
import type { ThoracicSurgeryWorkload } from '@/services/api/thoracicSurgeryWorkloadM866';

const surgeryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '手术类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ThoracicSurgeryWorkload) => void): ColumnsType<ThoracicSurgeryWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '手术数', dataIndex: 'surgeries', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '肺叶切除数', dataIndex: 'lobectomy', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '食管癌手术数', dataIndex: 'esophagectomy', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function ThoracicSurgeryManagementM866Page() {
  usePageTitle('胸外科管理');
  const { items, loading, error, demo, load } = useThoracicSurgeryWorkloadM866Store();
  const [detail, setDetail] = useState<ThoracicSurgeryWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="胸外科管理"
      description="日期 / 门诊数 / 住院数 / 手术数 / 肺叶切除数 / 食管癌手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`胸外科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="胸外科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="住院数">{detail.inpatient}</Descriptions.Item>
              <Descriptions.Item label="手术数">{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="肺叶切除数">{detail.lobectomy}</Descriptions.Item>
              <Descriptions.Item label="食管癌手术数">{detail.esophagectomy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="胸腔镜手术记录" span={2}>{detail.vatsRecords}</Descriptions.Item>
              <Descriptions.Item label="肺叶切除记录" span={2}>{detail.lobectomyRecords}</Descriptions.Item>
              <Descriptions.Item label="术后管理（胸腔引流/呼吸训练）" span={2}>{detail.postOp}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术类型分解（肺癌/食管癌/纵隔肿瘤/气胸）">
              <Table rowKey="name" dataSource={detail.surgeryBreakdown} columns={surgeryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
