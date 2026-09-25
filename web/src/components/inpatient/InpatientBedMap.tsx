/**
 * 健澜科技 jlmedaios - 住院床位图（M1-A，真实 BFF）
 *
 * 按病区显示床位与四态色块（空闲/占用/维护/隔离）：
 *  - 占用床：显示脱敏患者、病情、护理等级，点击打开患者摘要抽屉；
 *  - 非占用床：下拉菜单可维护床位状态（需 inpatient:bed:manage）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import { Card, Dropdown, Empty, Segmented, Space, Spin, Tag } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useInpatientStore } from '@/store/inpatientStore';
import { useAuthStore } from '@/store/authStore';
import type { BedCell, InpatientBedStatus } from '@/types/inpatient';
import {
  bedStatusMeta,
  bedTypeMeta,
  conditionMeta,
  genderText,
  nursingLevelMeta,
} from './bedMeta';

type ViewMode = 'all' | string;

export default function InpatientBedMap() {
  const { bedMap, loadingMap, selectVisit, setBedStatus } = useInpatientStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [view, setView] = useState<ViewMode>('all');

  const wards = bedMap?.wards ?? [];
  const shownWards = view === 'all' ? wards : wards.filter((w) => w.id === view);

  const wardOptions = useMemo(
    () => [{ label: '全部病区', value: 'all' }, ...wards.map((w) => ({ label: w.name, value: w.id }))],
    [wards],
  );

  if (loadingMap && !bedMap) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin tip="加载床位图…" />
      </div>
    );
  }

  if (!bedMap || wards.length === 0) {
    return <Empty description="暂无可显示的病区（可能超出数据权限范围）" />;
  }

  return (
    <div className="space-y-4">
      {/* 工具栏：病区切换 + 图例 */}
      <Card size="small">
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Segmented options={wardOptions} value={view} onChange={(v) => setView(v as string)} />
          <Space wrap>
            {(Object.keys(bedStatusMeta) as InpatientBedStatus[]).map((s) => (
              <Tag
                key={s}
                style={{
                  color: bedStatusMeta[s].color,
                  background: bedStatusMeta[s].bg,
                  borderColor: bedStatusMeta[s].border,
                }}
              >
                {bedStatusMeta[s].label}
              </Tag>
            ))}
          </Space>
        </Space>
      </Card>

      {shownWards.map((ward) => (
        <Card
          key={ward.id}
          size="small"
          title={
            <Space wrap>
              <span className="font-semibold text-jl-primary">{ward.name}</span>
              <span className="text-xs text-ink-secondary">
                {ward.campusName} · {ward.department}
                {ward.floor ? ` · ${ward.floor}` : ''}
              </span>
            </Space>
          }
          extra={
            <Space wrap size={4}>
              <Tag>总 {ward.stats.total}</Tag>
              <Tag color="green">空 {ward.stats.available}</Tag>
              <Tag color="blue">占 {ward.stats.occupied}</Tag>
              <Tag color="default">维护 {ward.stats.maintenance}</Tag>
              <Tag color="gold">隔离 {ward.stats.isolation}</Tag>
            </Space>
          }
        >
          <BedRoomGrid
            beds={ward.beds}
            canManageBed={hasPermission('inpatient:bed:manage')}
            canView={hasPermission('inpatient:view')}
            onOpen={(visitId) => void selectVisit(visitId)}
            onSetStatus={(bedId, status) => void setBedStatus(bedId, status)}
          />
        </Card>
      ))}
    </div>
  );
}

/** 按病房分组渲染床位色块 */
function BedRoomGrid({
  beds,
  canManageBed,
  canView,
  onOpen,
  onSetStatus,
}: {
  beds: BedCell[];
  canManageBed: boolean;
  canView: boolean;
  onOpen: (visitId: string) => void;
  onSetStatus: (bedId: string, status: 'available' | 'maintenance' | 'isolation') => void;
}) {
  // 按 roomNo 分组（床位已按 sort_order 排序）
  const rooms = new Map<string, BedCell[]>();
  for (const b of beds) {
    const key = b.roomNo ?? '其他';
    if (!rooms.has(key)) rooms.set(key, []);
    rooms.get(key)!.push(b);
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {[...rooms.entries()].map(([roomNo, roomBeds]) => (
        <div
          key={roomNo}
          className="rounded-md border border-ink-border bg-ink-bg/40 p-2"
        >
          <div className="mb-1 flex items-center justify-between text-xs text-ink-secondary">
            <span>{roomNo === '其他' ? '' : `${roomNo} 房`}</span>
            <span>{roomBeds.length} 床</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {roomBeds.map((bed) => (
              <BedTile
                key={bed.id}
                bed={bed}
                canManageBed={canManageBed}
                canView={canView}
                onOpen={onOpen}
                onSetStatus={onSetStatus}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BedTile({
  bed,
  canManageBed,
  canView,
  onOpen,
  onSetStatus,
}: {
  bed: BedCell;
  canManageBed: boolean;
  canView: boolean;
  onOpen: (visitId: string) => void;
  onSetStatus: (bedId: string, status: 'available' | 'maintenance' | 'isolation') => void;
}) {
  const meta = bedStatusMeta[bed.status];
  const occ = bed.occupant;

  const statusMenu = {
    items: [
      { key: 'available', label: '置为空闲' },
      { key: 'maintenance', label: '置为维护' },
      { key: 'isolation', label: '置为隔离' },
    ],
    onClick: ({ key }: { key: string }) =>
      onSetStatus(bed.id, key as 'available' | 'maintenance' | 'isolation'),
  };

  const tile = (
    <div
      role="button"
      tabIndex={occ ? 0 : -1}
      onClick={() => occ && canView && onOpen(occ.visitId)}
      className="relative flex h-24 flex-col rounded-md border p-1.5"
      style={{
        background: meta.bg,
        borderColor: meta.border,
        borderLeft: `4px solid ${meta.color}`,
        cursor: occ ? 'pointer' : 'default',
      }}
      title={bedTypeMeta[bed.bedType]}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: meta.color }}>
          {bed.bedNo}
        </span>
        {!occ && canManageBed && (
          <SettingOutlined style={{ color: '#bfbfbf', fontSize: 11 }} />
        )}
      </div>

      {occ ? (
        <>
          <div className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-ink-primary">
            <UserOutlined style={{ fontSize: 10 }} />
            <span className="truncate">{occ.nameMasked}</span>
            <span className="text-ink-secondary">
              {genderText(occ.gender)}
              {occ.age != null ? `·${occ.age}` : ''}
            </span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-ink-secondary" title={occ.diagnosis}>
            {occ.diagnosis}
          </div>
          <div className="mt-auto flex flex-wrap gap-0.5 pt-0.5">
            <Tag
              style={{
                marginInlineEnd: 0,
                fontSize: 9,
                lineHeight: '14px',
                padding: '0 2px',
                color: conditionMeta[occ.condition].color,
                background: conditionMeta[occ.condition].bg,
                border: 'none',
              }}
            >
              {conditionMeta[occ.condition].label}
            </Tag>
            <Tag
              style={{
                marginInlineEnd: 0,
                fontSize: 9,
                lineHeight: '14px',
                padding: '0 2px',
                color: nursingLevelMeta[occ.nursingLevel].color,
                background: nursingLevelMeta[occ.nursingLevel].bg,
                border: 'none',
              }}
            >
              {nursingLevelMeta[occ.nursingLevel].label.replace('护理', '')}
            </Tag>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-[11px]" style={{ color: meta.color }}>
          {meta.label}
        </div>
      )}
    </div>
  );

  // 非占用且有床位管理权限：下拉维护状态
  if (!occ && canManageBed) {
    return (
      <Dropdown menu={statusMenu} trigger={['click']}>
        {tile}
      </Dropdown>
    );
  }
  return tile;
}
