/**
 * 健澜科技 jlmedaios - 眼科管理（M778）
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
import { useEyePatientM778Store } from '@/store/eyePatientM778Store';
import {
  EYE_SIDE_META,
  type EyePatient,
} from '@/services/api/eyePatientM778';

const surColumns: ColumnsType<{ date: string; name: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '手术名称', dataIndex: 'name' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: EyePatient) => void): ColumnsType<EyePatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  {
    title: '眼别',
    dataIndex: 'side',
    width: 110,
    render: (v: EyePatient['side']) => <Tag color="blue">{EYE_SIDE_META[v].label}</Tag>,
  },
  { title: '视力', dataIndex: 'visualAcuity', width: 160 },
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

export default function OphthalmologyM778Page() {
  usePageTitle('眼科管理');
  const { items, loading, error, demo, load } = useEyePatientM778Store();
  const [detail, setDetail] = useState<EyePatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="眼科管理"
      description="住院号 / 患者姓名 / 诊断 / 眼别 / 视力 / 治疗方案 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`眼科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="眼科患者详情"
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
              <Descriptions.Item label="眼别">{EYE_SIDE_META[detail.side].label}</Descriptions.Item>
              <Descriptions.Item label="当前视力">{detail.visualAcuity}</Descriptions.Item>
              <Descriptions.Item label="视力检查" span={2}>{detail.acuity}</Descriptions.Item>
              <Descriptions.Item label="眼压（IOP）">{detail.iop}</Descriptions.Item>
              <Descriptions.Item label="裂隙灯">{detail.slitLamp}</Descriptions.Item>
              <Descriptions.Item label="眼底" span={2}>{detail.fundus}</Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.treatment}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术记录">
              <Table rowKey="date" dataSource={detail.surgeryRecords} columns={surColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
