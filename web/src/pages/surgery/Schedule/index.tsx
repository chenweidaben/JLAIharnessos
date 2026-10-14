/**
 * 健澜科技 jlmedaios - 手术排程看板
 *
 * 日视图：手术间列 × 时间行网格，手术块按起止分钟落位；
 * 周视图：周一..周日 × 手术间，当日安排卡片化。
 * demo:true 时显式警示「演示数据」，不冒充真实排程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Layout,
  Segmented,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useSurgeryScheduleStore } from '@/store/surgeryScheduleStore';
import type { PlacedItem } from '@/services/api/surgerySchedule';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '手术排程', 'jlmedaios'];

/** 看板时间轴 08:00-17:00，与后端 DAY_START/END 对齐 */
const DAY_SPAN_MIN = (17 - 8) * 60;
const DAY_OFFSET_MIN = 8 * 60;

const STATUS_META: Record<string, { label: string; color: string }> = {
  requested: { label: '待排程', color: 'default' },
  scheduled: { label: '已排程', color: 'geekblue' },
  prechecked: { label: '已核对', color: 'purple' },
  induction: { label: '麻醉诱导', color: 'cyan' },
  maintenance: { label: '手术中', color: 'processing' },
  recovery: { label: '麻醉复苏', color: 'warning' },
  pacu: { label: 'PACU', color: 'magenta' },
  discharged: { label: '已离室', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function ItemChip({ item, compact = false }: { item: PlacedItem; compact?: boolean }) {
  const meta = STATUS_META[item.status] ?? { label: item.status, color: 'default' };
  return (
    <div
      data-testid="schedule-item"
      data-demo={item.demo ? 'true' : 'false'}
      className={`rounded-jl border-l-4 border-jl-primary bg-white p-1.5 shadow-card ${
        compact ? 'text-xs' : ''
      }`}
      style={{ borderLeftColor: '#0A4D8C' }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-medium text-ink-primary">{item.procedure}</span>
        <Tag color={meta.color} className="!mr-0 !ml-1 !text-[10px]">
          {meta.label}
        </Tag>
      </div>
      {!compact && (
        <div className="mt-0.5 text-[11px] leading-4 text-ink-secondary">
          {item.startLabel}-{item.endLabel} · {item.department} · {item.surgeonLabel} · {item.patientLabel}
        </div>
      )}
    </div>
  );
}

function DayGrid() {
  const { board } = useSurgeryScheduleStore();
  const day = board?.day;
  if (!day) return null;

  return (
    <div className="overflow-x-auto rounded-jl border border-ink-border bg-white p-3 shadow-card">
      <div className="flex" style={{ minWidth: 960 }}>
        {/* 时间列头 */}
        <div className="w-14 shrink-0">
          <div className="mb-1 h-6 text-center text-xs font-semibold text-jl-primary">时间</div>
        </div>
        {day.rooms.map((room) => (
          <div key={room} className="min-w-0 flex-1 border-l border-ink-border pl-1">
            <div className="mb-1 h-6 truncate text-center text-xs font-semibold text-jl-primary">{room}</div>
          </div>
        ))}
      </div>
      <div className="flex" style={{ minWidth: 960 }}>
        {/* 时间刻度 + 网格 */}
        <div className="relative w-14 shrink-0" style={{ height: 360 }}>
          {day.timeSlots.map((slot) => {
            const top = ((slot.minute - DAY_OFFSET_MIN) / DAY_SPAN_MIN) * 360;
            return (
              <div key={slot.minute} className="absolute -translate-y-1/2 text-right pr-1 text-[10px] text-ink-secondary" style={{ top }}>
                {slot.label}
              </div>
            );
          })}
        </div>
        {day.rooms.map((room) => (
          <div key={room} className="relative min-w-0 flex-1 border-l border-ink-border" style={{ height: 360 }}>
            {/* 半小时网格线 */}
            {day.timeSlots.map((slot) => {
              const top = ((slot.minute - DAY_OFFSET_MIN) / DAY_SPAN_MIN) * 360;
              return <div key={slot.minute} className="absolute left-0 right-0 border-t border-dashed border-ink-border" style={{ top }} />;
            })}
            {day.items
              .filter((it) => it.room === room)
              .map((it) => {
                const top = ((it.startMinute - DAY_OFFSET_MIN) / DAY_SPAN_MIN) * 360;
                const height = Math.max(((it.durationMin - 15) / DAY_SPAN_MIN) * 360, 28);
                return (
                  <div key={it.id} className="absolute left-0.5 right-0.5" style={{ top, height }}>
                    <ItemChip item={it} compact />
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekGrid() {
  const { board } = useSurgeryScheduleStore();
  const week = board?.week;
  if (!week) return null;
  return (
    <div className="overflow-x-auto rounded-jl border border-ink-border bg-white p-3 shadow-card">
      <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(7, minmax(140px, 1fr))` }}>
        <div className="text-center text-xs font-semibold text-jl-primary">手术间</div>
        {week.days.map((d) => (
          <div key={d.date} className="text-center text-xs font-semibold text-jl-primary">
            <div>{d.weekday}</div>
            <div className="text-[10px] font-normal text-ink-secondary">{d.date.slice(5)}</div>
          </div>
        ))}
        {week.rooms.map((room) => (
          <Fragment key={room}>
            <div className="flex items-center justify-center rounded-jl bg-jl-primary/5 p-2 text-xs font-medium text-jl-primary">
              {room}
            </div>
            {week.days.map((d) => (
              <div key={`${room}-${d.date}`} className="space-y-1 rounded-jl border border-ink-border p-1">
                {d.items.filter((it) => it.room === room).map((it) => (
                  <ItemChip key={it.id} item={it} compact />
                ))}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function SurgerySchedulePage() {
  const { board, loading, error, load } = useSurgeryScheduleStore();
  const [date, setDate] = useState<Dayjs>(dayjs(localToday()));
  const [mode, setMode] = useState<'day' | 'week'>('day');

  const dateStr = useMemo(() => date.format('YYYY-MM-DD'), [date]);

  useEffect(() => {
    void load(dateStr);
  }, [load, dateStr]);

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <CalendarOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              手术排程看板
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">手术间 × 时间网格 · 日视图 / 周视图</span>
          </div>
          <SpaceCompat />
        </Header>
        <Content className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Segmented
                options={[
                  { label: '日视图', value: 'day' },
                  { label: '周视图', value: 'week' },
                ]}
                value={mode}
                onChange={(v) => setMode(v as 'day' | 'week')}
              />
              <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
            </div>
            <Button icon={<ReloadOutlined />} onClick={() => void load(dateStr)} loading={loading}>
              刷新
            </Button>
          </div>

          {board?.demo && (
            <Alert
              data-testid="schedule-demo-alert"
              type="warning"
              showIcon
              banner
              message="当前无真实手术排程数据，以下为演示行（demo:true），仅供看板版式参考，不可作为手术安排依据。"
            />
          )}
          {error && <Alert type="error" showIcon banner message={error} />}

          <Spin spinning={loading}>
            {mode === 'day' ? <DayGrid /> : <WeekGrid />}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}

/** 标题右侧留白占位（保持 Header 平衡） */
function SpaceCompat() {
  return <span className="w-24" />;
}
