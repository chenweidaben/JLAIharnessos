/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 技术架构页：六层架构图 + 技术栈 + 安全合规 + 集成能力 + 性能指标
 */
import { useEffect } from 'react';
import { CheckCircleFilled, SafetyCertificateFilled } from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import { techStackGroups, securityItems, performanceItems } from '@/mock/demoMock';

const archLayers = [
  {
    name: '表现层',
    color: '#0A4D8C',
    items: ['医生工作站', '患者 360 视图', '管理驾驶舱', '移动端 / 大屏', 'Web / 小程序'],
  },
  {
    name: '应用层',
    color: '#1890FF',
    items: ['智能问诊', '住院查房', '急诊分诊', '质控管理', '运营分析'],
  },
  {
    name: '智能服务层',
    color: '#13C2C2',
    items: ['多 Agent 编排', '36 个医疗工具', '37 条 CDS 规则', 'RAG 知识库', '流式对话引擎'],
  },
  {
    name: '数据层',
    color: '#722ED1',
    items: ['PostgreSQL', 'pgvector 向量库', 'Redis 缓存', 'Kafka 消息', '数据仓库'],
  },
  {
    name: '集成层',
    color: '#FA8C16',
    items: ['HL7 v2.x', 'FHIR R4', 'DICOM', 'HIS/EMR/LIS/PACS 适配器', '消息总线'],
  },
  {
    name: '基础设施层',
    color: '#52C41A',
    items: ['Docker', 'Kubernetes', 'Prometheus', 'Grafana', '等保三级安全'],
  },
];

export default function ArchitecturePage() {
  useEffect(() => {
    document.title = '技术架构 · 健澜科技数智医院智能体';
  }, []);

  return (
    <div>
      <GradientBackground variant="dark" className="pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            dark
            title="技术架构"
            subtitle="云原生 · 微服务 · AI 原生 · 安全合规——面向未来的医院操作系统底座"
          />
        </div>
      </GradientBackground>

      <section className="bg-[#F5F7FA] py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* 六层架构图 */}
          <FadeInOnScroll>
            <div className="space-y-3">
              {archLayers.map((layer, idx) => (
                <FadeInOnScroll key={layer.name} delay={idx * 70}>
                  <div className="flex flex-col gap-3 rounded-jl border border-[#E1E8F0] bg-white p-4 shadow-card sm:flex-row sm:items-center">
                    <div
                      className="flex h-10 w-full flex-none items-center justify-center rounded-lg text-sm font-bold text-white sm:w-32"
                      style={{ backgroundColor: layer.color }}
                    >
                      {layer.name}
                    </div>
                    <div className="flex flex-1 flex-wrap gap-2">
                      {layer.items.map((it) => (
                        <span
                          key={it}
                          className="rounded-md bg-[#F2F8FF] px-2.5 py-1 text-xs text-[#2B3A52]"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                </FadeInOnScroll>
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* 技术栈 */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title="技术栈" subtitle="现代化、经过生产验证的技术选型" />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {techStackGroups.map((g, i) => (
              <FadeInOnScroll key={g.category} delay={(i % 3) * 80}>
                <div className="h-full rounded-jl border border-[#E8ECF1] p-5">
                  <h4 className="m-0 mb-3 text-sm font-semibold text-[#1A2B45]">{g.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-full bg-[#F2F8FF] px-2.5 py-1 text-xs text-jl-primary"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 安全合规 + 集成能力 */}
      <section className="bg-[#F5F9FF] py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FadeInOnScroll>
            <div className="h-full rounded-jl bg-white p-6 shadow-card">
              <h3 className="m-0 mb-4 flex items-center gap-2 text-lg font-bold text-[#1A2B45]">
                <SafetyCertificateFilled className="text-jl-primary" /> 安全合规
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {securityItems.map((s) => (
                  <div key={s} className="flex items-start gap-2">
                    <CheckCircleFilled className="mt-1 text-[#52C41A]" />
                    <span className="text-sm text-[#3A4B66]">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={100}>
            <div className="h-full rounded-jl bg-white p-6 shadow-card">
              <h3 className="m-0 mb-4 flex items-center gap-2 text-lg font-bold text-[#1A2B45]">
                集成能力
              </h3>
              <ul className="m-0 list-none space-y-2 p-0 text-sm text-[#3A4B66]">
                <li>· HIS / EMR / LIS / PACS 标准适配器</li>
                <li>· 4 大厂商骨架：东华 / 创业 / 联众 / 智业</li>
                <li>· 16 种 HL7 消息类型</li>
                <li>· 22 种 FHIR 资源模型</li>
                <li>· 企业级消息总线，削峰填谷</li>
                <li>· DICOM 影像无缝对接 PACS</li>
              </ul>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* 性能指标 */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionTitle title="性能指标" subtitle="生产级稳定性与响应速度" />
          <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {performanceItems.map((p, i) => (
              <FadeInOnScroll key={p.label} delay={i * 80}>
                <div className="rounded-jl bg-[#F5F9FF] p-5 text-center">
                  <div className="text-2xl font-bold text-jl-primary sm:text-3xl">{p.value}</div>
                  <div className="mt-2 text-sm text-ink-secondary">{p.label}</div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-ink-secondary">
            指标为生产环境典型观测值，具体以实际部署环境为准。
          </p>
        </div>
      </section>
    </div>
  );
}
