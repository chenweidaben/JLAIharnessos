/**
 * 健澜AI原生医院操作系统OS - 三级检诊签名
 * 待签名病程列表 + 住院医/主治/主任三级签名 + 退回下级
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface RoundRow {
  id: string;
  roundNo: string;
  patient: string;
  bedNo: string;
  dept: string;
  title: string;
  level: '住院医' | '主治医' | '主任医';
  author: string;
  status: '待签名' | '已签名' | '已退回';
  createTime: string;
}

const demoRows: RoundRow[] = [
  { id: '1', roundNo: 'WR-20261103-001', patient: '张三', bedNo: '呼吸科-12床', dept: '呼吸内科', title: '首次病程记录', level: '住院医', author: '住院医-李', status: '待签名', createTime: '2026-11-03 09:00' },
  { id: '2', roundNo: 'WR-20261103-002', patient: '王五', bedNo: '心内科-08床', dept: '心血管内科', title: '日常查房记录', level: '主治医', author: '主治医-赵', status: '待签名', createTime: '2026-11-03 10:30' },
  { id: '3', roundNo: 'WR-20261102-003', patient: '刘六', bedNo: '消化科-21床', dept: '消化内科', title: '主任医师查房记录', level: '主任医', author: '主任医-陈', status: '已签名', createTime: '2026-11-02 15:00' },
];

export default function ThreeLevelWardRoundSignPage() {
  usePageTitle('三级检诊签名');
  const [list, setList] = useState<RoundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<RoundRow | null>(null);
  const [actionType, setActionType] = useState<'sign' | 'return'>('sign');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/ward-rounds/pending-sign')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.rounds ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setList(demoRows);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openConfirm = (row: RoundRow, type: 'sign' | 'return') => {
    setCurrentRow(row);
    setActionType(type);
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    if (!currentRow) return;
    const url = actionType === 'sign' ? `/api/v1/ward-rounds/${currentRow.id}/sign` : `/api/v1/ward-rounds/${currentRow.id}/return`;
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewer: '当前医生' }) });
      message.success(`病程 ${currentRow.roundNo} ${actionType === 'sign' ? '签名完成' : '已退回下级'}`);
      setList((prev) => prev.filter((r) => r.id !== currentRow.id));
      setConfirmOpen(false);
    } catch {
      message.error('操作失败');
    }
  };

  const levelColor: Record<string, string> = {
    '住院医': 'default',
    '主治医': 'blue',
    '主任医': 'purple',
  };

  const columns: ColumnsType<RoundRow> = [
    { title: '病程号', dataIndex: 'roundNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '床号', dataIndex: 'bedNo', width: 120 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '记录标题', dataIndex: 'title' },
    { title: '检诊级别', dataIndex: 'level', width: 90, render: (v: string) => <Tag color={levelColor[v]}>{v}</Tag> },
    { title: '书写医生', dataIndex: 'author', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待签名' ? 'orange' : v === '已签名' ? 'green' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '时间', dataIndex: 'createTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" type="primary" onClick={() => openConfirm(row, 'sign')}>签名</Button>
          <Button size="small" danger onClick={() => openConfirm(row, 'return')}>退回下级</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="三级检诊签名" description="住院医/主治医/主任医三级检诊病程签名与退回">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={actionType === 'sign' ? `三级检诊签名 - ${currentRow?.roundNo ?? ''}` : `退回下级修改 - ${currentRow?.roundNo ?? ''}`}
        open={confirmOpen}
        onOk={() => void onConfirm()}
        onCancel={() => setConfirmOpen(false)}
        okText={actionType === 'sign' ? '确认签名' : '确认退回'}
      >
        {currentRow && (
          <div>
            <p>患者：{currentRow.patient}（{currentRow.bedNo}）</p>
            <p>记录：{currentRow.title}</p>
            <p>检诊级别：{currentRow.level}</p>
            <p style={{ color: '#666' }}>
              {actionType === 'sign' ? '签名后病程记录正式生效。' : '退回下级医生修改后重新提交。'}
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
