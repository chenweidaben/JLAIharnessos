/**
 * 健澜科技 jlmedaios - 耳鼻喉科管理（M779）
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
import { useEntPatientM779Store } from '@/store/entPatientM779Store';
import type { EntPatient } from '@/services/api/entPatientM779';

const recColumns: ColumnsType<{ date: string; action: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: EntPatient) => void): ColumnsType<EntPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '部位', dataIndex: 'site', width: 160, ellipsis: true },
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

export default function EntM779Page() {
  usePageTitle('耳鼻喉科管理');
  const { items, loading, error, demo, load } = useEntPatientM779Store();
  const [detail, setDetail] = useState<EntPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="耳鼻喉科管理"
      description="住院号 / 患者姓名 / 诊断 / 部位 / 治疗方案 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`耳鼻喉患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="耳鼻喉患者详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="部位">{detail.site}</Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.treatment}</Descriptions.Item>
              <Descriptions.Item label="耳镜 / 鼻内镜 / 喉镜检查" span={2}>{detail.endoscopy}</Descriptions.Item>
              <Descriptions.Item label="听力检查" span={2}>{detail.hearing}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗记录">
              <Table rowKey="date" dataSource={detail.records} columns={recColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
