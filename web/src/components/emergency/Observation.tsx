/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 留观管理：留观床位 / 24小时出入统计 / 超时预警 / 入院离院办理
 */
import { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Button, Card, Table, Tag } from 'antd';
import { ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import clsx from 'clsx';
import type { ColumnsType } from 'antd/es/table';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { ObservationPatient } from '@/types/emergency';
import { formatDateTime } from '@/utils/format';
import { isVitalAbnormal, OBS_STATUS_META } from './constants';

const OVERTIME_MIN = 24 * 60;

function fmtStay(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
}

export default function Observation() {
  const { message } = AntdApp.useApp();
  const { observationPatients, emergencyStats, fetchObservationList } = useEmergencyStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void fetchObservationList();
  }, [fetchObservationList]);

  const stayOf = (p: ObservationPatient) =>
    Math.max(p.stayMinutes, Math.floor((now - dayjs(p.obsTime).valueOf()) / 60000));

  const active = observationPatients.filter(
    (p) => p.status !== 'discharged' && p.status !== 'admitted',
  );
  const overtime = active.filter((p) => stayOf(p) > OVERTIME_MIN);

  const columns: ColumnsType<ObservationPatient> = [
    {
      title: '床位',
      dataIndex: 'bedNo',
      width: 90,
      render: (v: string) => <b className="text-jl-primary">{v}</b>,
    },
    {
      title: '患者',
      dataIndex: 'name',
      width: 120,
      render: (_: string, r) => (
        <div>
          <div className="font-semibold text-ink-primary">{r.name}</div>
          <div className="text-xs text-ink-secondary">
            {r.gender === 'male' ? '男' : '女'} · {r.age}岁
          </div>
        </div>
      ),
    },
    {
      title: '诊断',
      dataIndex: 'diagnosis',
      ellipsis: true,
    },
    {
      title: '生命体征',
      width: 220,
      render: (_, r) => {
        const v = r.vitals;
        return (
          <div className="flex flex-wrap gap-x-2 text-xs">
            <span>
              T{' '}
              <b
                className={clsx(
                  isVitalAbnormal('temperature', v.temperature) && 'text-medical-critical',
                )}
              >
                {v.temperature ?? '--'}
              </b>
            </span>
            <span>
              P{' '}
              <b className={clsx(isVitalAbnormal('pulse', v.pulse) && 'text-medical-critical')}>
                {v.pulse ?? '--'}
              </b>
            </span>
            <span>
              BP{' '}
              <b
                className={clsx(isVitalAbnormal('systolic', v.systolic) && 'text-medical-critical')}
              >
                {v.systolic ?? '--'}/{v.diastolic ?? '--'}
              </b>
            </span>
            <span>
              SpO₂{' '}
              <b className={clsx(isVitalAbnormal('spo2', v.spo2) && 'text-medical-critical')}>
                {v.spo2 ?? '--'}%
              </b>
            </span>
          </div>
        );
      },
    },
    {
      title: '留观时长',
      width: 130,
      render: (_, r) => {
        const m = stayOf(r);
        const over = m > OVERTIME_MIN;
        return (
          <span
            className={clsx(
              'flex items-center gap-1 text-sm font-semibold',
              over ? 'animate-pulse-slow text-medical-critical' : 'text-ink-primary',
            )}
          >
            <ClockCircleOutlined /> {fmtStay(m)}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: ObservationPatient['status']) => {
        const m = OBS_STATUS_META[s];
        return (
          <Tag color={m.color} className="mr-0">
            {m.label}
          </Tag>
        );
      },
    },
    {
      title: '护理/治疗',
      width: 160,
      render: (_, r) => (
        <div className="text-xs">
          <div className="text-ink-secondary">{r.nursingLevel}护理</div>
          {r.ivStatus && <div className="text-jl-primary">{r.ivStatus}</div>}
        </div>
      ),
    },
    {
      title: '待处理',
      dataIndex: 'pendingTasks',
      ellipsis: true,
      render: (tasks: string[]) =>
        tasks.length ? tasks.join('；') : <span className="text-ink-secondary">—</span>,
    },
    {
      title: '操作',
      width: 150,
      render: (_, r) => (
        <div className="flex gap-1">
          <Button
            size="small"
            type="link"
            onClick={() => message.success(`已为 ${r.name} 办理入院`)}
          >
            办理入院
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => message.success(`已为 ${r.name} 办理离院`)}
          >
            办理离院
          </Button>
        </div>
      ),
    },
  ];

  const cards = useMemo(
    () => [
      { label: '在观人数', value: active.length, color: '#0A4D8C' },
      {
        label: '今日已离院',
        value: emergencyStats?.today.dischargedToday ?? '--',
        color: '#52C41A',
      },
      { label: '今日已入院', value: emergencyStats?.today.admittedToday ?? '--', color: '#1890FF' },
      { label: '留观超时(>24h)', value: overtime.length, color: '#F5222D' },
    ],
    [active.length, emergencyStats, overtime.length],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-card">
            <div className="text-xs text-ink-secondary">{c.label}</div>
            <div className="text-2xl font-semibold" style={{ color: c.color }}>
              {c.value}
            </div>
          </Card>
        ))}
      </div>

      {overtime.length > 0 && (
        <Card className="shadow-card" style={{ borderLeft: '3px solid #F5222D' }}>
          <div className="flex items-center gap-2 text-sm text-medical-critical">
            <ExclamationCircleOutlined />
            <b>留观超时提醒：</b>
            {overtime.map((p) => `${p.name}（${fmtStay(stayOf(p))}）`).join('、')}{' '}
            已超过24小时，请评估是否入院或离院。
          </div>
        </Card>
      )}

      <Card className="shadow-card" title={`留观患者列表（${active.length}）`}>
        <Table rowKey="id" columns={columns} dataSource={active} pagination={false} size="middle" />
      </Card>

      <div className="text-xs text-ink-secondary">
        留观开始时间：最早{' '}
        {active.length ? formatDateTime(active[active.length - 1].obsTime) : '--'} ·
        超过24小时需重新评估
      </div>
    </div>
  );
}
