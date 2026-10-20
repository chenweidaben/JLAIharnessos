/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者管理：在院患者列表
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Input, Spin, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

import { EmptyState, PageContainer, StatusBadge } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { listPatients } from '@/api/patient';
import { usePatientStore } from '@/store/patientStore';
import type { Patient } from '@/types/patient';

/** 深海蓝 VI 色板 */
const JL = {
  navy: '#0A2540', // 主色：深蓝
  blue: '#1E5F8C', // 辅色
  accent: '#4A90D9', // 强调色
} as const;

export default function PatientList() {
  usePageTitle('患者管理');
  const navigate = useNavigate();
  const { patientList, setPatientList, selectPatient } = usePatientStore();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listPatients()
      .then((list) => {
        // v5.0试点扩展（浏览器bug修复）：API 返回 null/undefined 时归一为空数组，
        // 避免下游 patientList.filter 抛错导致整个内容区白屏。
        if (alive) setPatientList(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) message.error('患者列表加载失败，请稍后重试');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [setPatientList]);

  // 前端关键字过滤：住院号 / 姓名 / 诊断
  // v5.0试点扩展（浏览器bug修复）：store 中 patientList 可能为 null/undefined（异常态），
  // 先归一为数组再过滤/渲染，杜绝 .filter 抛错造成白屏。
  const filtered = useMemo(() => {
    const src = Array.isArray(patientList) ? patientList : [];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return src;
    return src.filter((p) =>
      [p.patientNo, p.name, p.diagnosis ?? ''].join(' ').toLowerCase().includes(kw),
    );
  }, [patientList, keyword]);

  const columns: ColumnsType<Patient> = [
    { title: '住院号', dataIndex: 'patientNo', width: 140 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 70,
      render: (g: string) => (g === 'male' ? '男' : g === 'female' ? '女' : '未知'),
    },
    { title: '年龄', dataIndex: 'age', width: 70 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    { title: '床号', dataIndex: 'bedNo', width: 80 },
    { title: '入院诊断', dataIndex: 'diagnosis' },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: () => <StatusBadge level="normal" text="在院" />,
    },
  ];

  return (
    <PageContainer title="患者管理" description="在院患者列表（演示数据已脱敏）">
      <Card className="jl-card" style={{ borderTop: `3px solid ${JL.accent}` }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-base font-medium" style={{ color: JL.navy }}>
            在院患者台账
          </h3>
          <Input.Search
            placeholder="按住院号 / 姓名 / 诊断搜索"
            style={{ maxWidth: 320 }}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Spin spinning={loading}>
          <Table<Patient>
            rowKey="id"
            className="jl-table-hover"
            columns={columns}
            dataSource={filtered}
            locale={{ emptyText: <EmptyState description="暂无患者数据" /> }}
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 人` }}
            onRow={(record) => ({
              onClick: () => {
                selectPatient(record);
                navigate(`/patients/${record.id}`);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </Spin>
      </Card>
    </PageContainer>
  );
}
