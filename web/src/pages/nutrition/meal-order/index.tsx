/**
 * 健澜科技 jlmedaios - 营养科膳食管理（M692）
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
import { useNutritionMealOrderM692Store } from '@/store/nutritionMealOrderM692Store';
import {
  MEAL_STATUS_META,
  MEAL_TYPE_META,
  type MealOrder,
} from '@/services/api/nutritionMealOrderM692';

const buildColumns = (setDetail: (r: MealOrder) => void): ColumnsType<MealOrder> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 110 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  {
    title: '膳食类型',
    dataIndex: 'mealType',
    width: 130,
    render: (v: MealOrder['mealType']) => <Tag color={MEAL_TYPE_META[v].color}>{MEAL_TYPE_META[v].label}</Tag>,
  },
  { title: '特殊要求', dataIndex: 'specialReq', ellipsis: true },
  {
    title: '过敏禁忌',
    dataIndex: 'allergies',
    width: 140,
    render: (arr: string[]) =>
      arr.length ? (
        arr.map((a) => <Tag key={a} color="red">{a}</Tag>)
      ) : (
        <span style={{ color: '#ccc' }}>—</span>
      ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MealOrder['status']) => <Tag color={MEAL_STATUS_META[v].color}>{MEAL_STATUS_META[v].label}</Tag>,
  },
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

export default function NutritionMealOrderM692Page() {
  usePageTitle('营养科膳食管理');
  const { items, loading, error, demo, load } = useNutritionMealOrderM692Store();
  const [detail, setDetail] = useState<MealOrder | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="营养科膳食管理"
      description="住院号 / 患者 / 膳食类型 / 特殊要求 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`膳食医嘱（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="膳食医嘱详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="膳食类型">
              <Tag color={MEAL_TYPE_META[detail.mealType].color}>{MEAL_TYPE_META[detail.mealType].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="特殊要求">{detail.specialReq}</Descriptions.Item>
            <Descriptions.Item label="过敏禁忌">
              {detail.allergies.length
                ? detail.allergies.map((a) => <Tag key={a} color="red">{a}</Tag>)
                : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="营养评估 / 医嘱">{detail.nutritionNote}</Descriptions.Item>
            <Descriptions.Item label="执行状态">
              <Tag color={MEAL_STATUS_META[detail.status].color}>{MEAL_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
