/**
 * 健澜科技 jlmedaios - 疼痛科管理（M774）
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
import { usePainPatientM774Store } from '@/store/painPatientM774Store';
import type { PainPatient } from '@/services/api/painPatientM774';

const trColumns: ColumnsType<{ date: string; action: string; vas: number }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: 'VAS', dataIndex: 'vas', width: 80, align: 'right' },
];

const vasColor = (v: number) => (v >= 7 ? 'red' : v >= 4 ? 'orange' : 'green');

const buildColumns = (setDetail: (r: PainPatient) => void): ColumnsType<PainPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '疼痛部位', dataIndex: 'location', width: 220, ellipsis: true },
  {
    title: 'VAS 评分',
    dataIndex: 'vas',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={vasColor(v)}>{v}</Tag>,
  },
  { title: '治疗方案', dataIndex: 'treatment', width: 220, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
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

export default function PainM774Page() {
  usePageTitle('疼痛科管理');
  const { items, loading, error, demo, load } = usePainPatientM774Store();
  const [detail, setDetail] = useState<PainPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="疼痛科管理"
      description="住院号 / 患者姓名 / 疼痛部位 / VAS 评分 / 治疗方案 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`疼痛患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="疼痛患者详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="疼痛部位" span={2}>{detail.location}</Descriptions.Item>
              <Descriptions.Item label="当前 VAS">
                <Tag color={vasColor(detail.vas)}>{detail.vas}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.treatment}</Descriptions.Item>
              <Descriptions.Item label="疼痛评估" span={2}>{detail.assessment}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗记录与 VAS 变化趋势">
              <Table rowKey="date" dataSource={detail.treatmentRecords} columns={trColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
