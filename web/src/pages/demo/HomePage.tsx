/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 产品首页（Landing Page）：Hero / 数据指标 / 核心功能 / 场景 / 技术优势 / 评价 / CTA
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tag } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import FeatureCard from '@/components/demo/FeatureCard';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import AnimatedCounter from '@/components/demo/AnimatedCounter';
import MockupFrame from '@/components/demo/MockupFrame';
import { DemoIcon } from '@/components/demo/icons';
import { coreFeatures, homeStats, scenarios, techStackGroups, testimonials } from '@/mock/demoMock';

const heroValues = ['智能决策', '全流程协同', '安全合规'];

export default function HomePage() {
  useEffect(() => {
    document.title = '健澜科技 · 数智医院智能体';
  }, []);

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <GradientBackground variant="dark" className="pb-20 pt-32 sm:pt-36">
        {/* 装饰网格 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <FadeInOnScroll>
              <Tag color="blue" className="mb-5 !px-3 !py-1 text-sm">
                AI 原生医院 3.0 · 全新发布
              </Tag>
            </FadeInOnScroll>
            <FadeInOnScroll delay={80}>
              <h1 className="m-0 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                健澜科技数智医院智能体
              </h1>
            </FadeInOnScroll>
            <FadeInOnScroll delay={160}>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
                AI 驱动的下一代智慧医院操作系统
              </p>
            </FadeInOnScroll>

            <FadeInOnScroll delay={220}>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {heroValues.map((v) => (
                  <span key={v} className="flex items-center gap-1.5 text-white/85">
                    <CheckCircleOutlined className="text-[#7BE0C3]" />
                    {v}
                  </span>
                ))}
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={300}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link to="/demo/chat">
                  <Button type="primary" size="large" className="!px-6">
                    立即体验
                  </Button>
                </Link>
                <Link to="/demo/about">
                  <Button
                    size="large"
                    ghost
                    className="!border-white/40 !px-6 !text-white hover:!border-white hover:!text-white"
                  >
                    预约演示
                  </Button>
                </Link>
              </div>
            </FadeInOnScroll>
          </div>

          {/* 产品界面预览 */}
          <FadeInOnScroll delay={400} className="relative mx-auto mt-14 max-w-5xl">
            <MockupFrame url="https://demo.jianlan.tech/dashboard" height={340}>
              <div className="grid grid-cols-3 gap-4 p-6">
                {[
                  { label: '今日门诊', value: '1,286', tone: 'text-jl-primary' },
                  { label: '在院人数', value: '864', tone: 'text-[#13C2C2]' },
                  { label: '危急值待处理', value: '2', tone: 'text-[#F5222D]' },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-white p-4 shadow-card">
                    <div className="text-xs text-ink-secondary">{c.label}</div>
                    <div className={`mt-1 text-2xl font-bold ${c.tone}`}>{c.value}</div>
                  </div>
                ))}
                <div className="col-span-3 rounded-lg bg-white p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1A2B45]">
                      智能助手 · 今日查房摘要
                    </span>
                    <Tag color="processing">已完成</Tag>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2.5 w-full rounded bg-[#EAF2FB]" />
                    <div className="h-2.5 w-11/12 rounded bg-[#EAF2FB]" />
                    <div className="h-2.5 w-4/5 rounded bg-[#EAF2FB]" />
                  </div>
                </div>
              </div>
            </MockupFrame>
          </FadeInOnScroll>
        </div>
      </GradientBackground>

      {/* ---------------- 数据指标 ---------------- */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {homeStats.map((s, i) => (
              <FadeInOnScroll key={s.label} delay={i * 90} className="text-center">
                <div className="text-4xl font-bold text-jl-primary sm:text-5xl">
                  <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="mt-2 text-base font-medium text-[#1A2B45]">{s.label}</div>
                <div className="mt-1 text-xs text-ink-secondary">{s.description}</div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 核心功能 ---------------- */}
      <section className="bg-[#F5F9FF] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="六大核心模块"
            subtitle="从智能问诊到系统集成，覆盖临床与管理全流程的一体化能力"
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((f, i) => (
              <FadeInOnScroll key={f.key} delay={(i % 3) * 90}>
                <FeatureCard
                  icon={f.icon}
                  title={f.title}
                  description={f.summary}
                  points={f.points}
                />
              </FadeInOnScroll>
            ))}
          </div>
          <FadeInOnScroll className="mt-10 text-center">
            <Link to="/demo/features">
              <Button type="primary" size="large">
                查看全部功能 <ArrowRightOutlined />
              </Button>
            </Link>
          </FadeInOnScroll>
        </div>
      </section>

      {/* ---------------- 场景应用 ---------------- */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="真实医疗场景"
            subtitle="围绕门诊、住院、急诊、质控四大核心场景，提供开箱即用的智能体能力"
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {scenarios.map((s, i) => (
              <FadeInOnScroll key={s.key} delay={(i % 2) * 90}>
                <Link to="/demo/scenarios" className="block no-underline">
                  <div className="group flex h-full flex-col rounded-jl border border-[#E8ECF1] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-jl-primary/40 hover:shadow-card-hover">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2FB] text-xl text-jl-primary">
                        <DemoIcon name={s.icon} />
                      </span>
                      <RightOutlined className="text-ink-secondary transition-transform group-hover:translate-x-1 group-hover:text-jl-primary" />
                    </div>
                    <h3 className="m-0 text-lg font-semibold text-[#1A2B45]">{s.title}</h3>
                    <p className="m-0 mt-1 text-sm text-jl-primary/80">{s.tagline}</p>
                    <p className="m-0 mt-3 line-clamp-3 text-sm leading-relaxed text-ink-secondary">
                      {s.description}
                    </p>
                  </div>
                </Link>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 技术优势 ---------------- */}
      <GradientBackground variant="dark" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            dark
            title="云原生 · AI 原生技术架构"
            subtitle="基于四中台微服务架构，等保三级安全合规，为医院数字化转型提供坚实底座"
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {techStackGroups.map((g, i) => (
              <FadeInOnScroll key={g.category} delay={(i % 3) * 80}>
                <div className="h-full rounded-jl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <h4 className="m-0 mb-3 text-base font-semibold text-white">{g.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/80"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
          <FadeInOnScroll className="mt-10 text-center">
            <Link to="/demo/architecture">
              <Button size="large" ghost className="!border-white/40 !px-6 !text-white">
                <PlayCircleOutlined /> 了解技术架构
              </Button>
            </Link>
          </FadeInOnScroll>
        </div>
      </GradientBackground>

      {/* ---------------- 客户评价 ---------------- */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title="客户之声" subtitle="来自一线医院管理者与临床医生的真实反馈" />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <FadeInOnScroll key={t.name} delay={i * 90}>
                <div className="flex h-full flex-col rounded-jl bg-[#F5F9FF] p-6">
                  <div className="mb-3 text-2xl text-jl-primary/30">“</div>
                  <p className="m-0 flex-1 text-sm leading-relaxed text-[#3A4B66]">{t.content}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jl-primary text-sm font-medium text-white">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[#1A2B45]">
                        {t.hospital} · {t.name}
                      </div>
                      <div className="text-xs text-ink-secondary">{t.title}</div>
                    </div>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <GradientBackground variant="dark" className="py-20">
        <FadeInOnScroll className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="m-0 text-3xl font-bold text-white sm:text-4xl">开启智慧医院新时代</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/80">
            立即体验健澜科技数智医院智能体，让 AI 成为每位医生的专业副驾。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/demo/chat">
              <Button type="primary" size="large" className="!px-7">
                免费试用
              </Button>
            </Link>
            <Link to="/demo/about">
              <Button size="large" ghost className="!border-white/40 !px-7 !text-white">
                联系销售
              </Button>
            </Link>
          </div>
        </FadeInOnScroll>
      </GradientBackground>
    </div>
  );
}
