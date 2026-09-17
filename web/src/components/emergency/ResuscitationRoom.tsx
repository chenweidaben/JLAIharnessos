/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 抢救室管理：床位图 / 抢救时间轴 / 生命体征趋势 / 设备状态 / 抢救团队
 */
import { useMemo, useState } from 'react';
import { Badge, Card, Drawer, Empty, Tag, Timeline } from 'antd';
import {
  AlertOutlined,
  ApiOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';

import { LineChart } from '@/components/charts';
import { useEmergencyStore } from '@/store/emergencyStore';
import type { ResusBed } from '@/types/emergency';
import { clickableProps } from '@/utils/a11y';
import { RESUS_STATUS_META } from './constants';

const EVENT_COLOR: Record<string, string> = {
  vitals: '#1890FF',
  medication: '#722ED1',
  procedure: '#F5222D',
  exam: '#13C2C2',
  consult: '#FAAD14',
  evaluation: '#52C41A',
};

function BedCard({ bed, onClick }: { bed: ResusBed; onClick: () => void }) {
  const meta = RESUS_STATUS_META[bed.status];
  const empty = bed.status === 'empty';
  const alarm = bed.devices.some((d) => d.status === 'alarm');
  return (
    <div
      {...(!empty ? clickableProps(onClick) : {})}
      className={clsx(
        'cursor-pointer rounded-jl border p-3 shadow-card transition-shadow hover:shadow-card-hover',
        empty ? 'border-dashed bg-gray-50' : 'bg-white',
      )}
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink-primary">{bed.bedNo}</span>
        <Badge color={meta.color} text={meta.label} />
      </div>
      {empty ? (
        <div className="mt-4 text-center text-xs text-ink-secondary">空床</div>
      ) : (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-ink-primary">{bed.patient?.name}</span>
            <span className="text-xs text-ink-secondary">
              {bed.patient?.gender === 'male' ? '男' : '女'} · {bed.patient?.age}岁
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-ink-secondary">{bed.patient?.diagnosis}</div>
          {bed.durationMin != null && (
            <div className="mt-1 text-xs">
              已抢救 <b style={{ color: meta.color }}>{bed.durationMin}</b> 分钟
            </div>
          )}
          <div className="mt-1 text-xs text-ink-secondary">
            医师 {bed.doctor} / 护士 {bed.nurse}
          </div>
          {bed.criticalValue && (
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-medical-critical">
              <AlertOutlined /> 危急值：{bed.criticalValue}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {bed.devices.map((d) => (
              <Tag
                key={d.name}
                color={
                  d.status === 'alarm' ? 'error' : d.status === 'running' ? 'processing' : 'default'
                }
                className="mr-0"
              >
                {d.name}
              </Tag>
            ))}
            {alarm && (
              <span className="animate-pulse-slow text-xs font-semibold text-medical-critical">
                设备报警!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResuscitationRoom() {
  const { resuscitationBeds, resuscitationRecords } = useEmergencyStore();
  const [activeBed, setActiveBed] = useState<ResusBed | null>(null);

  const record = activeBed ? resuscitationRecords[activeBed.id] : undefined;

  const trend = useMemo(() => {
    if (!record) return { xData: [], series: [] as { name: string; data: number[] }[] };
    return {
      xData: record.vitalTrend.map((v) => v.time),
      series: [
        { name: '心率', data: record.vitalTrend.map((v) => v.heartRate) },
        { name: '收缩压', data: record.vitalTrend.map((v) => v.systolic) },
        { name: 'SpO₂', data: record.vitalTrend.map((v) => v.spo2) },
      ],
    };
  }, [record]);

  const resusCount = resuscitationBeds.filter((b) => b.status === 'resuscitating').length;
  const emptyBeds = resuscitationBeds.filter((b) => b.status === 'empty').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="shadow-card">
          <div className="text-xs text-ink-secondary">抢救床位</div>
          <div className="text-2xl font-semibold text-ink-primary">{resuscitationBeds.length}</div>
        </Card>
        <Card className="shadow-card">
          <div className="text-xs text-ink-secondary">抢救中</div>
          <div className="text-2xl font-semibold text-medical-critical">{resusCount}</div>
        </Card>
        <Card className="shadow-card">
          <div className="text-xs text-ink-secondary">空床</div>
          <div className="text-2xl font-semibold text-medical-normal">{emptyBeds}</div>
        </Card>
        <Card className="shadow-card">
          <div className="text-xs text-ink-secondary">设备报警</div>
          <div className="text-2xl font-semibold text-medical-critical">
            {resuscitationBeds.reduce(
              (n, b) => n + b.devices.filter((d) => d.status === 'alarm').length,
              0,
            )}
          </div>
        </Card>
      </div>

      {resuscitationBeds.length === 0 ? (
        <Empty description="抢救室数据加载中" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {resuscitationBeds.map((bed) => (
            <BedCard key={bed.id} bed={bed} onClick={() => setActiveBed(bed)} />
          ))}
        </div>
      )}

      {/* 抢救记录抽屉 */}
      <Drawer
        open={!!activeBed}
        onClose={() => setActiveBed(null)}
        width={640}
        title={
          <span>
            {activeBed?.bedNo} · 抢救记录 —— {activeBed?.patient?.name}
          </span>
        }
      >
        {!record ? (
          <Empty description="暂无抢救记录" />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-jl-primary/5 p-3 text-sm">
              <div>
                <b>诊断：</b>
                {activeBed?.patient?.diagnosis}
              </div>
              <div>
                <b>开始：</b>
                {record.startTime.slice(11, 16)}
              </div>
              {record.outcome && (
                <div>
                  <b>转归：</b>
                  {record.outcome}
                </div>
              )}
            </div>

            {/* 团队 */}
            <div>
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <TeamOutlined /> 抢救团队
              </div>
              <div className="flex flex-wrap gap-2">
                {record.team.map((m) => (
                  <Tag key={m.name} color="blue">
                    {m.role} · {m.name}
                  </Tag>
                ))}
              </div>
            </div>

            {/* 生命体征趋势 */}
            <div>
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <ApiOutlined /> 生命体征趋势（每5-15分钟）
              </div>
              <LineChart xData={trend.xData} series={trend.series} height={220} />
            </div>

            {/* 用药 */}
            {record.medications.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <MedicineBoxOutlined /> 用药记录
                </div>
                <div className="space-y-1">
                  {record.medications.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-purple-600">{m.drug}</span>
                      <span>
                        {m.dose} · {m.route}
                      </span>
                      <span className="text-ink-secondary">{m.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 时间轴 */}
            <div>
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <ExperimentOutlined /> 抢救时间轴
              </div>
              <Timeline
                items={record.events.map((e) => ({
                  color: EVENT_COLOR[e.category] ?? 'gray',
                  children: (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-secondary">{e.time}</span>
                        {e.operator && (
                          <span className="text-xs text-ink-secondary">{e.operator}</span>
                        )}
                      </div>
                      <div className="text-sm text-ink-primary">{e.content}</div>
                    </div>
                  ),
                }))}
              />
            </div>

            {record.summary && (
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-ink-secondary">
                {record.summary}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
