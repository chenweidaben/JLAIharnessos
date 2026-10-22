/**
 * 健澜科技 jlmedaios - 呼吸内科管理（M859）
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
import { usePulmonologyWorkloadM859Store } from '@/store/pulmonologyWorkloadM859Store';
import type { PulmonologyWorkload } from '@/services/api/pulmonologyWorkloadM859';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PulmonologyWorkload) => void): ColumnsType<PulmonologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '支气管镜数', dataIndex: 'bronchoscopy', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '肺功能数', dataIndex: 'pulmonaryFunction', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '呼吸机数', dataIndex: 'ventilator', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function PulmonologyManagementM859Page() {
  usePageTitle('呼吸内科管理');
  const { items, loading, error, demo, load } = usePulmonologyWorkloadM859Store();
  const [detail, setDetail] = useState<PulmonologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="呼吸内科管理"
      description="日期 / 门诊数 / 住院数 / 支气管镜数 / 肺功能数 / 呼吸机数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`呼吸科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="呼吸科工作详情"
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
              <Descriptions.Item label="支气管镜数">{detail.bronchoscopy}</Descriptions.Item>
              <Descriptions.Item label="肺功能数">{detail.pulmonaryFunction}</Descriptions.Item>
              <Descriptions.Item label="呼吸机数">{detail.ventilator}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="支气管镜记录" span={2}>{detail.bronchoscopyRecords}</Descriptions.Item>
              <Descriptions.Item label="肺功能检查" span={2}>{detail.pulmonaryFunctionRecords}</Descriptions.Item>
              <Descriptions.Item label="无创通气记录" span={2}>{detail.nonInvasiveVentilation}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（慢阻肺/哮喘/肺炎/肺癌）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
