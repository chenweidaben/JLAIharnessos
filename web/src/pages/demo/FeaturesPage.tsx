/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 功能展示页：六大核心模块左右交替布局，含功能要点与界面预览
 */
import { useEffect } from 'react';
import { CheckCircleFilled } from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import MockupFrame from '@/components/demo/MockupFrame';
import { DemoIcon } from '@/components/demo/icons';
import { coreFeatures, type DemoFeature } from '@/mock/demoMock';

/** 每个功能模块的 Mock 界面预览（纯前端示意） */
function FeaturePreview({ feature }: { feature: DemoFeature }) {
  return (
    <div className="p-4">
      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2FB] text-jl-primary">
            <DemoIcon name={feature.icon} />
          </span>
          <span className="text-sm font-semibold text-[#1A2B45]">{feature.title} · 工作台</span>
        </div>
        {feature.points.map((p, i) => (
          <div key={p} className="mb-2 flex items-center gap-2 rounded-md bg-[#F7FAFE] px-3 py-2">
            <CheckCircleFilled className="text-[#13C2C2]" />
            <span className="text-xs text-[#3A4B66]">{p}</span>
            <span className="ml-auto text-[10px] text-ink-secondary">0{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  useEffect(() => {
    document.title = '核心功能 · 健澜科技数智医院智能体';
  }, []);

  return (
    <div>
      <GradientBackground variant="dark" className="pb-16 pt-32 sm:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            dark
            title="六大核心模块"
            subtitle="智能问诊、临床决策、患者360、质控、运营、集成——一体化覆盖临床与管理全流程"
          />
        </div>
      </GradientBackground>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 lg:px-8">
          {coreFeatures.map((f, idx) => {
            const reverse = idx % 2 === 1;
            return (
              <FadeInOnScroll key={f.key}>
                <div
                  className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 ${
                    reverse ? 'lg:[&>*:first-child]:order-2' : ''
                  }`}
                >
                  {/* 文字 */}
                  <div>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2FB] text-2xl text-jl-primary">
                      <DemoIcon name={f.icon} />
                    </div>
                    <h3 className="m-0 text-2xl font-bold text-[#1A2B45]">{f.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-ink-secondary">{f.summary}</p>
                    {f.metric ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EAF2FB] px-4 py-1.5">
                        <span className="text-xs text-ink-secondary">{f.metric.label}</span>
                        <span className="text-sm font-bold text-jl-primary">{f.metric.value}</span>
                      </div>
                    ) : null}
                    <ul className="mt-5 m-0 list-none p-0">
                      {f.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 py-1.5">
                          <CheckCircleFilled className="mt-1 text-[#52C41A]" />
                          <span className="text-sm text-[#3A4B66]">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* 预览 */}
                  <MockupFrame url={`https://demo.jianlan.tech/features/${f.key}`} height={320}>
                    <FeaturePreview feature={f} />
                  </MockupFrame>
                </div>
              </FadeInOnScroll>
            );
          })}
        </div>
      </section>
    </div>
  );
}
