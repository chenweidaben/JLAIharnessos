/**
 * 健澜科技 jlmedaios - 在院患者列表（M1-A，真实 BFF）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import { Card, Empty, Input, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInpatientStore } from '@/store/inpatientStore';
import type { InpatientListItem } from '@/types/inpatient';
import {
  conditionMeta,
  genderText,
  nursingLevelMeta,
} from './bedMeta';

export default function InpatientList() {
  const { patients, total, loadingList, selectVisit } = useInpatientStore();
  const [kw, setKw] = useState('');

  const data = useMemo(() => {
    const k = kw.trim();
    if (!k) return patients;
    return patients.filter(
      (p) =>
        p.nameMasked.includes(k) ||
        p.bedNo?.includes(k) ||
        p.mrn.includes(k) ||
        p.visitNo.includes(k) ||
        p.diagnosis.includes(k),
    );
  }, [patients, kw]);

  const columns: ColumnsType<InpatientListItem> = [
    {
      title: '床位',
      dataIndex: 'bedNo',
      width: 110,
      render: (_v, r) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.2 }}>
          <span className="font-semibold text-jl-primary">{r.bedNo ?? '--'}</span>
          <span className="text-[10px] text-ink-secondary">{r.wardName}</span>
        </Space>
      ),
    },
    {
      title: '患者',
      width: 150,
      render: (_v, r) => (
        <Space size={4}>
          <span className="font-medium">{r.nameMasked}</span>
          <span className="text-xs text-ink-secondary">
            {genderText(r.gender)}
            {r.age != null ? ` · ${r.age}岁` : ''}
          </span>
        </Space>
      ),
    },
    { title: '住院号', dataIndex: 'visitNo', width: 110 },
    {
      title: '入院诊断',
      dataIndex: 'diagnosis',
      ellipsis: true,
    },
    {
      title: '病情',
      dataIndex: 'condition',
      width: 80,
      render: (_v, r) =>
        r.condition ? (
          <Tag
            style={{
              color: conditionMeta[r.condition].color,
              background: conditionMeta[r.condition].bg,
              border: 'none',
            }}
          >
            {conditionMeta[r.condition].label}
          </Tag>
        ) : (
          '--'
        ),
    },
    {
      title: '护理等级',
      dataIndex: 'nursingLevel',
      width: 90,
      render: (v: string) => (
        <Tag
          style={{ color: nursingLevelMeta[v].color, background: nursingLevelMeta[v].bg, border: 'none' }}
        >
          {nursingLevelMeta[v].label}
        </Tag>
      ),
    },
    {
      title: '入院时间',
      dataIndex: 'admittedAt',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString('zh-CN') : '--'),
    },
    { title: '住院天数', dataIndex: 'daysInHospital', width: 80, render: (v: number) => `${v} 天` },
  ];

  return (
    <Card
      size="small"
      title={
        <Space wrap>
          <span className="font-semibold text-jl-primary">在院患者</span>
          <Tag color="blue">共 {total} 人</Tag>
        </Space>
      }
      extra={
        <Input.Search
          allowClear
          placeholder="搜索床号/姓名/住院号/诊断"
          style={{ width: 260 }}
          onChange={(e) => setKw(e.target.value)}
        />
      }
    >
      {!loadingList && patients.length === 0 ? (
        <Empty description="当前范围无在院患者" />
      ) : (
        <Table<InpatientListItem>
          rowKey="visitId"
          size="small"
          columns={columns}
          dataSource={data}
          loading={loadingList}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          onRow={(r) => ({ onClick: () => void selectVisit(r.visitId), style: { cursor: 'pointer' } })}
        />
      )}
    </Card>
  );
}
