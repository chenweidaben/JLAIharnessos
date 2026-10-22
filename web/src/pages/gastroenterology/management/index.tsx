/**
 * 健澜科技 jlmedaios - 消化内科管理（M860）
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
import { useGastroenterologyWorkloadM860Store } from '@/store/gastroenterologyWorkloadM860Store';
import type { GastroenterologyWorkload } from '@/services/api/gastroenterologyWorkloadM860';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: GastroenterologyWorkload) => void): ColumnsType<GastroenterologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '胃镜数', dataIndex: 'gastroscopy', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '肠镜数', dataIndex: 'colonoscopy', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '内镜下治疗数', dataIndex: 'endoscopicTherapy', width: 150, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function GastroenterologyManagementM860Page() {
  usePageTitle('消化内科管理');
  const { items, loading, error, demo, load } = useGastroenterologyWorkloadM860Store();
  const [detail, setDetail] = useState<GastroenterologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="消化内科管理"
      description="日期 / 门诊数 / 住院数 / 胃镜数 / 肠镜数 / 内镜下治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`消化科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="消化科工作详情"
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
              <Descriptions.Item label="胃镜数">{detail.gastroscopy}</Descriptions.Item>
              <Descriptions.Item label="肠镜数">{detail.colonoscopy}</Descriptions.Item>
              <Descriptions.Item label="内镜下治疗数">{detail.endoscopicTherapy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="胃肠镜记录" span={2}>{detail.endoscopyRecords}</Descriptions.Item>
              <Descriptions.Item label="内镜下治疗（息肉/止血/ERCP）" span={2}>{detail.therapyRecords}</Descriptions.Item>
              <Descriptions.Item label="幽门螺杆菌检测" span={2}>{detail.hPylori}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（胃炎/溃疡/IBD/肝病）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
