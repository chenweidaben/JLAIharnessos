/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊台：候诊队列 / 四级分诊筛选 / 超时预警 / 分诊台统计
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as AntdApp, Button, Card, Input, Segmented, Space, Tag, Tooltip } from 'antd';
import {
  AudioOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import clsx from 'clsx';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { TriageLevel, TriagePatient } from '@/types/emergency';
import { formatDateTime } from '@/utils/format';
import { GC_TYPE_META, isVitalAbnormal, LEVEL_META, STATUS_META } from './constants';

type LevelFilter = 'all' | TriageLevel;

/** 生命体征紧凑展示 */
function VitalsMini({ p }: { p: TriagePatient }) {
  const v = p.vitals;
  const items: Array<{ k: string; label: string; val?: number; unit: string }> = [
    { k: 'temperature', label: 'T', val: v.temperature, unit: '℃' },
    { k: 'pulse', label: 'P', val: v.pulse, unit: '' },
    { k: 'respiration', label: 'R', val: v.respiration, unit: '' },
    { k: 'systolic', label: 'BP', val: v.systolic, unit: v.diastolic ? `/${v.diastolic}` : '' },
    { k: 'spo2', label: 'SpO₂', val: v.spo2, unit: '%' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((it) => (
        <span key={it.k} className="text-xs">
          <span className="text-ink-secondary">{it.label}</span>{' '}
          <span
            className={clsx(
              'font-semibold',
              it.val != null && isVitalAbnormal(it.k, it.val) && 'text-medical-critical',
            )}
          >
            {it.val != null ? `${it.val}${it.unit}` : '--'}
          </span>
        </span>
      ))}
    </div>
  );
}

/** 候诊行 */
function QueueRow({
  p,
  waitMin,
  overdue,
  onStart,
}: {
  p: TriagePatient;
  waitMin: number;
  overdue: boolean;
  onStart: (p: TriagePatient) => void;
}) {
  const navigate = useNavigate();
  const level = p.level != null ? LEVEL_META[p.level] : null;
  const st = STATUS_META[p.status];
  const gc = p.greenChannelActive && p.greenChannelType ? GC_TYPE_META[p.greenChannelType] : null;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-jl border bg-white px-3 py-2.5 shadow-card transition-shadow hover:shadow-card-hover',
        overdue ? 'border-medical-critical' : 'border-ink-border',
      )}
    >
      {/* 级别色条 */}
      <div
        className="flex h-14 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
        style={{ background: level?.color ?? '#BFBFBF' }}
      >
        {level?.short ?? '?'}
      </div>

      {/* 患者信息 */}
      <div className="w-44 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-ink-primary">{p.name}</span>
          <span className="text-xs text-ink-secondary">
            {p.gender === 'male' ? '男' : '女'} · {p.age}岁
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-secondary">{p.visitNo}</div>
      </div>

      {/* 主诉 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-ink-primary">{p.chiefComplaint}</span>
          {gc && (
            <Tag color={gc.color} className="mr-0 shrink-0">
              {gc.label}
            </Tag>
          )}
        </div>
        <VitalsMini p={p} />
      </div>

      {/* 时间 */}
      <div className="w-28 shrink-0 text-right">
        <div className="text-xs text-ink-secondary">{formatDateTime(p.arriveTime).slice(11)}</div>
        <div
          className={clsx(
            'flex items-center justify-end gap-1 text-sm font-semibold',
            overdue ? 'animate-pulse-slow text-medical-critical' : 'text-ink-primary',
          )}
        >
          <ClockCircleOutlined />
          {waitMin}分钟
        </div>
      </div>

      {/* 状态 + 操作 */}
      <div className="flex w-36 shrink-0 flex-col items-end gap-1">
        <Tag color={st.color} className="mr-0">
          {st.label}
        </Tag>
        <Space size={4}>
          <Button size="small" type="primary" onClick={() => onStart(p)}>
            开始分诊
          </Button>
          <Tooltip title="查看详情">
            <Button size="small" onClick={() => navigate(`/emergency/triage/${p.id}`)}>
              详情
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}

export default function TriageStation() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const {
    triageQueue,
    resuscitationBeds,
    observationPatients,
    greenChannels,
    emergencyStats,
    fetchTriageQueue,
    fetchResuscitationStatus,
    fetchObservationList,
    fetchEmergencyStats,
  } = useEmergencyStore();

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const levelOptions: { label: string; value: LevelFilter }[] = [
    { label: '全部', value: 'all' },
    { label: 'Ⅰ级濒危', value: 1 },
    { label: 'Ⅱ级危重', value: 2 },
    { label: 'Ⅲ级急症', value: 3 },
    { label: 'Ⅳ级非急症', value: 4 },
  ];
  const [keyword, setKeyword] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // 实时时钟，驱动等待时间与超时预警
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void fetchTriageQueue();
    void fetchResuscitationStatus();
    void fetchObservationList();
    void fetchEmergencyStats();
  }, [fetchTriageQueue, fetchResuscitationStatus, fetchObservationList, fetchEmergencyStats]);

  /** 实时等待分钟数 */
  const waitOf = (p: TriagePatient) =>
    Math.max(0, Math.floor((now - dayjs(p.arriveTime).valueOf()) / 60000));

  const isOverdue = (p: TriagePatient): boolean => {
    if (p.level == null || p.level === 1) return p.level === 1;
    return waitOf(p) > LEVEL_META[p.level].targetWait;
  };

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return triageQueue
      .filter((p) => p.status !== 'discharged')
      .filter((p) => (levelFilter === 'all' ? true : p.level === levelFilter))
      .filter((p) =>
        kw ? p.name.includes(kw) || p.chiefComplaint.includes(kw) || p.visitNo.includes(kw) : true,
      )
      .sort((a, b) => {
        const rank = (p: TriagePatient) =>
          p.status === 'resuscitation' ? 0 : p.level == null ? 1 : p.level;
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return waitOf(b) - waitOf(a);
      });
  }, [triageQueue, levelFilter, keyword, now]);

  const waitingCount = triageQueue.filter(
    (p) => p.status === 'triaged' || p.status === 'waiting_triage',
  ).length;
  const resusCount = resuscitationBeds.filter((b) => b.status === 'resuscitating').length;
  const activeGc = greenChannels.filter((g) => g.status === 'active').length;

  const stats = [
    {
      label: '今日急诊量',
      value: emergencyStats?.today.total ?? '--',
      suffix: '人次',
      icon: <MedicineBoxOutlined />,
      color: '#0A4D8C',
    },
    {
      label: '候诊人数',
      value: waitingCount,
      suffix: '人',
      icon: <TeamOutlined />,
      color: '#1890FF',
    },
    {
      label: '抢救中',
      value: resusCount,
      suffix: '床',
      icon: <ThunderboltOutlined />,
      color: '#F5222D',
    },
    {
      label: '留观人数',
      value: observationPatients.length,
      suffix: '人',
      icon: <ClockCircleOutlined />,
      color: '#13C2C2',
    },
    { label: '绿色通道', value: activeGc, suffix: '条', icon: <HeartOutlined />, color: '#EB2F96' },
    {
      label: '平均等待',
      value: emergencyStats?.today.avgWaitMinutes ?? '--',
      suffix: '分钟',
      icon: <ClockCircleOutlined />,
      color: '#FAAD14',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 分诊台统计 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-secondary">{s.label}</div>
                <div className="mt-1 text-2xl font-semibold text-ink-primary">
                  {s.value}
                  <span className="ml-1 text-xs font-normal text-ink-secondary">{s.suffix}</span>
                </div>
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
                style={{ background: `${s.color}1A`, color: s.color }}
              >
                {s.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 工具栏 */}
      <Card className="shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={levelFilter}
            onChange={(v) => setLevelFilter(v as LevelFilter)}
            options={levelOptions}
          />
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索姓名 / 主诉 / 就诊号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
            />
            <Button icon={<AudioOutlined />} onClick={() => message.info('已呼叫下一位候诊患者')}>
              呼叫患者
            </Button>
          </Space>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-secondary">
          <span>超时预警：</span>
          <span style={{ color: '#F5222D' }}>Ⅰ级立即</span>
          <span style={{ color: '#FA8C16' }}>Ⅱ级&lt;10分钟</span>
          <span style={{ color: '#FAAD14' }}>Ⅲ级&lt;30分钟</span>
          <span style={{ color: '#52C41A' }}>Ⅳ级&lt;120分钟</span>
        </div>
      </Card>

      {/* 候诊队列 */}
      <div className="space-y-2">
        {filtered.map((p) => (
          <QueueRow
            key={p.id}
            p={p}
            waitMin={waitOf(p)}
            overdue={isOverdue(p)}
            onStart={(pat) => navigate(`/emergency/triage/${pat.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <Card className="py-10 text-center text-ink-secondary">当前条件下暂无候诊患者</Card>
        )}
      </div>
    </div>
  );
}
