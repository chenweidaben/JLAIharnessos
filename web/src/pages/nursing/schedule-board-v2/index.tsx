/**
 * 健澜科技 jlmedaios - 护理排班看板 v2（M631，P0 合规）
 *
 * 三甲流程：周视图 Grid（行=护士，列=日期），单元格显示班次 Tag；
 * 点击单元格弹出 Modal 切换班次（白/小夜/大夜），仅本地覆盖。
 * 权限码 nursing:scheduling。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Radio,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useScheduleBoardV2M631Store } from '@/store/scheduleBoardV2M631Store';
import {
  SHIFT_META,
  type ShiftType,
} from '@/services/api/scheduleBoardV2M631';

interface CellRow {
  staffId: string;
  name: string;
  [dateKey: string]: ShiftType | string | undefined;
}

export default function ScheduleBoardV2M631Page() {
  usePageTitle('护理排班看板');
  const { hasPermission } = usePermission();
  const canSchedule = hasPermission('nursing:scheduling');

  const { staff, assignments, overrides, loading, error, demo, load, assign } =
    useScheduleBoardV2M631Store();

  useEffect(() => {
    void load();
  }, [load]);

  const dates = useMemo(() => {
    const today = dayjs().startOf('week');
    return Array.from({ length: 7 }, (_, i) => today.add(i, 'day').format('YYYY-MM-DD'));
  }, []);

  /** 合并服务端 assignments 与本地 overrides */
  const cellOf = (staffId: string, date: string): ShiftType | undefined =>
    overrides[`${staffId}|${date}`] ??
    assignments.find((a) => a.staffId === staffId && a.date === date)?.shift;

  const dataSource: CellRow[] = staff.map((n) => ({
    staffId: n.staffId,
    name: `${n.name}（${n.level}）`,
    ...Object.fromEntries(dates.map((d) => [d, cellOf(n.staffId, d)])),
  }));

  const columns = [
    { title: '护士', dataIndex: 'name', width: 180, fixed: 'left' as const },
    ...dates.map((d) => ({
      title: `${dayjs(d).format('MM-DD')}`,
      dataIndex: d,
      width: 110,
      render: (shift: ShiftType | undefined, row: CellRow) =>
        shift ? (
          <Tag
            color={SHIFT_META[shift].color}
            style={{ cursor: canSchedule ? 'pointer' : 'default' }}
            onClick={() => canSchedule && openModal(row.staffId as string, d)}
          >
            {SHIFT_META[shift].label}
          </Tag>
        ) : (
          <Button size="small" type="dashed" onClick={() => canSchedule && openModal(row.staffId as string, d)}>
            排
          </Button>
        ),
    })),
  ];

  const [modalCtx, setModalCtx] = useState<{ staffId: string; date: string } | null>(null);
  const [draft, setDraft] = useState<ShiftType>('day');

  function openModal(staffId: string, date: string) {
    const cur = cellOf(staffId, date);
    setModalCtx({ staffId, date });
    setDraft(cur ?? 'day');
  }

  const confirmAssign = () => {
    if (!modalCtx) return;
    assign(modalCtx.staffId, modalCtx.date, draft);
    message.success(`已为 ${modalCtx.staffId} 在 ${modalCtx.date} 排 ${SHIFT_META[draft].label}（本地覆盖，待后端持久化）`);
    setModalCtx(null);
  };

  return (
    <PageContainer
      title="护理排班看板（v2）"
      description="周视图：护士 × 日期班次矩阵"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canSchedule && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 nursing:scheduling 权限" />
      )}

      <Spin spinning={loading}>
        <Card size="small" title="本周排班">
          <Table rowKey="staffId" dataSource={dataSource} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Card>
      </Spin>

      <Modal
        open={modalCtx != null}
        title="排班编辑"
        onCancel={() => setModalCtx(null)}
        footer={
          <Space>
            <Button onClick={() => setModalCtx(null)}>取消</Button>
            <Button type="primary" onClick={confirmAssign}>
              确认
            </Button>
          </Space>
        }
      >
        {modalCtx && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="护士">{modalCtx.staffId}</Descriptions.Item>
              <Descriptions.Item label="日期">{dayjs(modalCtx.date).format('YYYY-MM-DD dddd')}</Descriptions.Item>
            </Descriptions>
            <Radio.Group value={draft} onChange={(e) => setDraft(e.target.value as ShiftType)}>
              <Space direction="vertical">
                {(Object.keys(SHIFT_META) as ShiftType[]).map((k) => (
                  <Radio key={k} value={k}>
                    <Tag color={SHIFT_META[k].color}>{SHIFT_META[k].label}</Tag>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
