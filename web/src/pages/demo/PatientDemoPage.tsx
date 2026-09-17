/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者 360 Demo：患者切换 + 概览/生命体征/检验/检查/医嘱/病历/费用 多标签页
 * 全部为脱敏 Mock 数据。
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Segmented, Tabs, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ExperimentOutlined } from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import { patients360, type LabStatus, type Patient360 } from '@/mock/demoMock';

const statusColor: Record<LabStatus, string> = {
  critical: '#F5222D',
  abnormal: '#FA8C16',
  normal: '#52C41A',
};
const statusLabel: Record<LabStatus, string> = {
  critical: '危急',
  abnormal: '异常',
  normal: '正常',
};

function VitalSignsChart({ p }: { p: Patient360 }) {
  const opt: EChartsOption = {
    color: ['#0A4D8C', '#13C2C2', '#FA8C16', '#F5222D', '#52C41A'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: p.vitals.times },
    yAxis: [
      { type: 'value', name: '次/分·℃', position: 'left' },
      { type: 'value', name: '血压 mmHg', position: 'right' },
    ],
    series: [
      { name: '体温℃', type: 'line', smooth: true, data: p.vitals.temperature },
      { name: '脉搏', type: 'line', smooth: true, data: p.vitals.pulse },
      { name: '呼吸', type: 'line', smooth: true, data: p.vitals.respiration },
      {
        name: '收缩压',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: p.vitals.systolic,
      },
      {
        name: '舒张压',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: p.vitals.diastolic,
      },
    ],
  };
  return <ReactECharts option={opt} style={{ height: 320, width: '100%' }} notMerge />;
}

function Spo2Chart({ p }: { p: Patient360 }) {
  const opt: EChartsOption = {
    color: ['#52C41A'],
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: p.vitals.times },
    yAxis: { type: 'value', min: 90, max: 100, name: 'SpO2 %' },
    series: [
      {
        name: '血氧',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: p.vitals.spo2,
      },
    ],
  };
  return <ReactECharts option={opt} style={{ height: 220, width: '100%' }} notMerge />;
}

function FeePie({ p }: { p: Patient360 }) {
  const opt: EChartsOption = {
    color: ['#0A4D8C', '#1890FF', '#13C2C2', '#FAAD14', '#722ED1'],
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        label: { formatter: '{b}\n{d}%' },
        data: p.fees.categories.map((c) => ({ name: c.name, value: c.value })),
      },
    ],
  };
  return <ReactECharts option={opt} style={{ height: 300, width: '100%' }} notMerge />;
}

export default function PatientDemoPage() {
  const [pid, setPid] = useState(patients360[0].id);
  const patient = useMemo(() => patients360.find((p) => p.id === pid) ?? patients360[0], [pid]);

  useEffect(() => {
    document.title = '患者 360 Demo · 健澜科技';
  }, []);

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {patient.overview.map((o) => (
            <div key={o.label} className="rounded-lg bg-[#F7FAFE] p-3">
              <div className="text-xs text-ink-secondary">{o.label}</div>
              <div
                className="mt-1 text-lg font-bold"
                style={{ color: o.status ? statusColor[o.status] : '#1A2B45' }}
              >
                {o.value}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'vitals',
      label: '生命体征',
      children: (
        <div>
          <VitalSignsChart p={patient} />
          <div className="mt-2 text-sm font-medium text-[#1A2B45]">血氧饱和度趋势</div>
          <Spo2Chart p={patient} />
        </div>
      ),
    },
    {
      key: 'labs',
      label: '检验结果',
      children: (
        <div className="space-y-4">
          {patient.labs.map((cat) => (
            <div key={cat.category} className="rounded-lg border border-[#E8ECF1]">
              <div className="border-b border-[#EEF2F7] bg-[#F7FAFE] px-4 py-2 text-sm font-medium text-[#1A2B45]">
                {cat.category}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-secondary">
                    <th className="px-4 py-2">项目</th>
                    <th className="px-4 py-2">结果</th>
                    <th className="px-4 py-2">参考范围</th>
                    <th className="px-4 py-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((it) => (
                    <tr key={it.name} className="border-t border-[#F2F5F9]">
                      <td className="px-4 py-2 text-[#3A4B66]">{it.name}</td>
                      <td
                        className="px-4 py-2 font-medium"
                        style={{ color: statusColor[it.status] }}
                      >
                        {it.value} {it.unit}
                      </td>
                      <td className="px-4 py-2 text-ink-secondary">{it.ref}</td>
                      <td className="px-4 py-2">
                        <Badge color={statusColor[it.status]} text={statusLabel[it.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'reports',
      label: '检查报告',
      children: (
        <div className="space-y-3">
          {patient.reports.map((r) => (
            <div
              key={r.date + r.modality}
              className="flex items-start gap-3 rounded-lg border border-[#E8ECF1] p-4"
            >
              <ExperimentOutlined className="mt-1 text-jl-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#1A2B45]">
                    {r.date} · {r.modality}
                  </span>
                  {r.abnormal ? <Tag color="error">异常</Tag> : <Tag color="success">正常</Tag>}
                </div>
                <div className="mt-1 text-sm text-ink-secondary">部位：{r.body}</div>
                <div className="mt-1 text-sm text-[#3A4B66]">结论：{r.conclusion}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'orders',
      label: '医嘱用药',
      children: (
        <div className="overflow-hidden rounded-lg border border-[#E8ECF1]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7FAFE] text-left text-xs text-ink-secondary">
                <th className="px-4 py-2">药品</th>
                <th className="px-4 py-2">剂量</th>
                <th className="px-4 py-2">频次</th>
                <th className="px-4 py-2">类型</th>
                <th className="px-4 py-2">开始</th>
              </tr>
            </thead>
            <tbody>
              {patient.medications.map((m) => (
                <tr key={m.name} className="border-t border-[#F2F5F9]">
                  <td className="px-4 py-2 text-[#2B3A52]">{m.name}</td>
                  <td className="px-4 py-2 text-[#3A4B66]">{m.dosage}</td>
                  <td className="px-4 py-2 text-[#3A4B66]">{m.frequency}</td>
                  <td className="px-4 py-2">
                    <Tag color={m.type === '长期' ? 'blue' : 'orange'}>{m.type}</Tag>
                  </td>
                  <td className="px-4 py-2 text-ink-secondary">{m.start}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: 'records',
      label: '病历文书',
      children: (
        <div className="space-y-3">
          {patient.records.map((r) => (
            <div key={r.title} className="rounded-lg border border-[#E8ECF1] p-4">
              <div className="flex items-center gap-2">
                <Tag color="processing">{r.type}</Tag>
                <span className="font-medium text-[#1A2B45]">{r.title}</span>
                <span className="ml-auto text-xs text-ink-secondary">{r.date}</span>
              </div>
              <p className="m-0 mt-2 line-clamp-2 text-sm text-[#3A4B66]">{r.snippet}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'fees',
      label: '费用概览',
      children: (
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm text-ink-secondary">住院总费用</div>
            <div className="text-3xl font-bold text-jl-primary">
              ¥ {patient.fees.total.toLocaleString()}
            </div>
            <div className="mt-4 space-y-2">
              {patient.fees.categories.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-ink-secondary">{c.name}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#EEF2F7]">
                    <div
                      className="h-2 rounded-full bg-jl-primary"
                      style={{ width: `${(c.value / patient.fees.total) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-[#3A4B66]">
                    ¥{c.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <FeePie p={patient} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <GradientBackground variant="dark" className="pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="m-0 text-3xl font-bold text-white sm:text-4xl">患者 360 Demo</h1>
          <p className="mt-3 text-base text-white/80">
            全维度患者数据聚合，时间轴串联就诊、检验、检查、用药全轨迹（脱敏演示数据）
          </p>
        </div>
      </GradientBackground>

      <section className="bg-[#F5F7FA] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* 患者切换 */}
          <div className="mb-4">
            <Segmented
              value={pid}
              onChange={(val) => setPid(val as string)}
              options={patients360.map((p) => ({
                label: `${p.name} · ${p.department}`,
                value: p.id,
              }))}
              className="!bg-white"
            />
          </div>

          {/* 患者信息卡 */}
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-jl bg-white p-5 shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-jl-primary text-xl font-bold text-white">
              {patient.name.charAt(0)}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-[#1A2B45]">{patient.name}</span>
                <Tag>{patient.gender}</Tag>
                <Tag color="blue">{patient.age} 岁</Tag>
                <Tag color="geekblue">{patient.department}</Tag>
                <Tag color="cyan">{patient.bed}</Tag>
              </div>
              <div className="mt-1 text-sm text-ink-secondary">
                住院号 {patient.inpatientNo} · 入院 {patient.admitDate} · 诊断：{patient.diagnosis}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-ink-secondary">过敏史</div>
              <div className="font-medium text-[#F5222D]">{patient.allergies.join('、')}</div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="rounded-jl bg-white p-4 shadow-card">
            <Tabs items={tabItems} />
          </div>
        </div>
      </section>
    </div>
  );
}
