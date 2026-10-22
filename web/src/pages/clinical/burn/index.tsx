/**
 * 健澜科技 jlmedaios - 烧伤科管理（M798）
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
import { useBurnPatientM798Store } from '@/store/burnPatientM798Store';
import {
  BURN_DEPTH_META,
  type BurnPatient,
} from '@/services/api/burnPatientM798';

const graftColumns: ColumnsType<{ date: string; procedure: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '手术', dataIndex: 'procedure' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: BurnPatient) => void): ColumnsType<BurnPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: 'TBSA', dataIndex: 'tbsa', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}%</Tag> },
  {
    title: '烧伤深度',
    dataIndex: 'depth',
    width: 120,
    render: (v: BurnPatient['depth']) => <Tag color={BURN_DEPTH_META[v].color}>{BURN_DEPTH_META[v].label}</Tag>,
  },
  { title: '烧伤部位', dataIndex: 'site', width: 200, ellipsis: true },
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

export default function BurnM798Page() {
  usePageTitle('烧伤科管理');
  const { items, loading, error, demo, load } = useBurnPatientM798Store();
  const [detail, setDetail] = useState<BurnPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="烧伤科管理"
      description="住院号 / 患者姓名 / TBSA / 烧伤深度 / 烧伤部位 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`烧伤患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="烧伤患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="烧伤面积 TBSA">
                <Tag color="red">{detail.tbsa}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="烧伤深度">
                <Tag color={BURN_DEPTH_META[detail.depth].color}>{BURN_DEPTH_META[detail.depth].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="烧伤部位" span={2}>{detail.site}</Descriptions.Item>
              <Descriptions.Item label="烧伤评估" span={2}>{detail.assessment}</Descriptions.Item>
              <Descriptions.Item label="创面处理" span={2}>{detail.woundCare}</Descriptions.Item>
              <Descriptions.Item label="补液方案" span={2}>{detail.fluid}</Descriptions.Item>
              <Descriptions.Item label="感染监测" span={2}>{detail.infection}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="植皮手术记录">
              <Table rowKey="date" dataSource={detail.graftSurgery} columns={graftColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
