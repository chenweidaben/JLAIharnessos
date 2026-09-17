/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 病区概览 - 床位图组件
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Input, Segmented, Space, Tooltip } from 'antd';
import {
  AlertOutlined,
  AuditOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { BedInfo, NursingLevel, WardInfo } from '@/types/ward';
import { clickableProps } from '@/utils/a11y';
import { conditionMeta, isolationMeta, nursingLevelMeta } from './meta';

interface BedMapProps {
  wardInfo: WardInfo | null;
  rooms: Array<{ roomNo: string; beds: BedInfo[] }>;
  onBedClick?: (patientId: string) => void;
}

type FilterKey = 'all' | NursingLevel | 'serious' | 'critical' | 'surgery';

export default function BedMap({ wardInfo, rooms }: BedMapProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredRooms = useMemo(() => {
    const kw = keyword.trim();
    return rooms
      .map((room) => ({
        ...room,
        beds: room.beds.filter((bed) => {
          const p = bed.patient;
          if (!p) return bed.status === 'empty' && filter === 'all' && !kw;
          if (kw && !(p.name.includes(kw) || p.inpatientNo.includes(kw) || bed.bedNo.includes(kw)))
            return false;
          if (filter === 'all') return true;
          if (filter === 'serious') return p.condition === 'serious';
          if (filter === 'critical') return p.condition === 'critical';
          if (filter === 'surgery') return !!p.todaySurgery || (p.postOpDays ?? -1) >= 0;
          return p.nursingLevel === filter;
        }),
      }))
      .filter((room) => room.beds.length > 0);
  }, [rooms, keyword, filter]);

  const stats = wardInfo
    ? [
        { label: '总床位', value: wardInfo.totalBeds, color: '#0A4D8C' },
        { label: '在院', value: wardInfo.admittedCount, color: '#52C41A' },
        { label: '空床', value: wardInfo.emptyBeds, color: '#8C8C8C' },
        { label: '今日手术', value: wardInfo.todaySurgeryCount, color: '#1890FF' },
        { label: '今日出院', value: wardInfo.todayDischargeCount, color: '#13C2C2' },
        { label: '新入院', value: wardInfo.todayAdmitCount, color: '#722ED1' },
        { label: '病重', value: wardInfo.seriousCount, color: '#FA8C16' },
        { label: '病危', value: wardInfo.criticalCount, color: '#F5222D' },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* 病区统计栏 */}
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-ink-border bg-white p-3 text-center shadow-card"
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="mt-1 text-xs text-ink-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-border bg-white p-3">
        <Space wrap>
          <span className="text-sm text-ink-secondary">筛选：</span>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as FilterKey)}
            options={[
              { label: '全部', value: 'all' },
              { label: '特级', value: 'special' },
              { label: '一级', value: 'level1' },
              { label: '二级', value: 'level2' },
              { label: '三级', value: 'level3' },
              { label: '病重', value: 'serious' },
              { label: '病危', value: 'critical' },
              { label: '手术', value: 'surgery' },
            ]}
          />
        </Space>
        <Input.Search
          allowClear
          placeholder="搜索床号 / 患者姓名 / 住院号"
          style={{ width: 260 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 床位图 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredRooms.map((room) => (
          <div
            key={room.roomNo}
            className="rounded-lg border border-ink-border bg-white p-3 shadow-card"
          >
            <div className="mb-2 flex items-center justify-between border-b border-ink-border pb-2">
              <span className="text-sm font-semibold text-jl-primary">病房 {room.roomNo}</span>
              <span className="text-xs text-ink-secondary">{room.beds.length} 床</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {room.beds.map((bed) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  onClick={() => bed.patient && navigate(`/ward/round/${bed.patient.id}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BedCard({ bed, onClick }: { bed: BedInfo; onClick: () => void }) {
  const p = bed.patient;
  if (!p) {
    return (
      <div
        {...clickableProps(onClick)}
        className="flex h-28 cursor-default flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-400"
      >
        <PlusOutlined />
        <div className="mt-1 text-sm font-semibold">{bed.bedNo}</div>
        <div className="text-xs">空床</div>
      </div>
    );
  }

  const nlm = nursingLevelMeta[p.nursingLevel];
  const cm = conditionMeta[p.condition];
  const iso = p.isolation ? isolationMeta[p.isolation] : null;

  return (
    <div
      {...clickableProps(onClick)}
      className="relative h-28 cursor-pointer overflow-hidden rounded-md border border-ink-border bg-white p-2 transition-shadow hover:shadow-card-hover"
      style={{ borderLeft: `4px solid ${nlm.color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-jl-primary">{bed.bedNo}</span>
        <span style={{ color: cm.color, fontSize: 12 }} title={cm.label}>
          {cm.icon}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-xs">
        <UserOutlined className="text-ink-secondary" />
        <span className="font-medium text-ink-primary">{p.name}</span>
        <span className="text-ink-secondary">
          {p.gender === 'male' ? '男' : '女'} · {p.age}岁
        </span>
      </div>
      <div className="mt-0.5 truncate text-xs text-ink-secondary" title={p.diagnosis}>
        {p.diagnosis}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className="rounded px-1 text-[10px] leading-4"
          style={{ color: nlm.color, background: nlm.bg }}
        >
          {nlm.label}
        </span>
        {p.allergies.length > 0 && (
          <Tooltip title={`过敏：${p.allergies.join('、')}`}>
            <span className="rounded bg-red-50 px-1 text-[10px] leading-4 text-red-600">
              <MedicineBoxOutlined /> 敏
            </span>
          </Tooltip>
        )}
        {iso && (
          <span
            className="rounded px-1 text-[10px] leading-4"
            style={{ color: iso.color, background: '#F9F0FF' }}
          >
            {iso.label}
          </span>
        )}
        {p.todaySurgery && <Badge count="术" style={{ background: '#1890FF', fontSize: 10 }} />}
        {typeof p.postOpDays === 'number' && !p.todaySurgery && (
          <span className="rounded bg-blue-50 px-1 text-[10px] leading-4 text-blue-600">
            术后{p.postOpDays}d
          </span>
        )}
        {p.pathway === 'on_path' && <AuditOutlined className="text-emerald-500" />}
        {p.inDebt && <AlertOutlined className="text-red-500" title="欠费" />}
      </div>
      <div className="absolute bottom-1 right-1 text-[10px] text-ink-secondary">
        <HeartOutlined style={{ color: cm.color }} /> 住{p.stayDays}d
      </div>
    </div>
  );
}
