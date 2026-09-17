/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 场景演示页：四大医疗场景，可点击展开流程步骤 / 功能亮点 / 跳转业务页
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Collapse, Tag } from 'antd';
import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import { DemoIcon } from '@/components/demo/icons';
import { scenarios } from '@/mock/demoMock';

export default function ScenariosPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '场景演示 · 健澜科技数智医院智能体';
  }, []);

  const items = scenarios.map((s) => ({
    key: s.key,
    label: (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF2FB] text-lg text-jl-primary">
          <DemoIcon name={s.icon} />
        </span>
        <div className="text-left">
          <div className="text-base font-semibold text-[#1A2B45]">{s.title}</div>
          <div className="text-xs text-ink-secondary">{s.tagline}</div>
        </div>
      </div>
    ),
    children: (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 描述 + 跳转 */}
        <div className="lg:col-span-1">
          <p className="m-0 text-sm leading-relaxed text-[#3A4B66]">{s.description}</p>
          <Button type="primary" className="mt-4" onClick={() => navigate(s.route)}>
            {s.cta} <ArrowRightOutlined />
          </Button>
        </div>
        {/* 流程步骤 */}
        <div>
          <h4 className="m-0 mb-3 text-sm font-semibold text-[#1A2B45]">流程步骤</h4>
          <ol className="m-0 list-none p-0">
            {s.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3 pb-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-jl-primary text-xs font-medium text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-[#3A4B66]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {/* 功能亮点 */}
        <div>
          <h4 className="m-0 mb-3 text-sm font-semibold text-[#1A2B45]">关键亮点</h4>
          {s.highlights.map((h) => (
            <div key={h} className="mb-2 flex items-start gap-2">
              <CheckCircleFilled className="mt-1 text-[#52C41A]" />
              <span className="text-sm text-[#3A4B66]">{h}</span>
            </div>
          ))}
          <div className="mt-4">
            {s.highlights.map((h) => (
              <Tag key={h + '-tag'} color="blue" className="mb-1">
                {h}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    ),
  }));

  return (
    <div>
      <GradientBackground variant="dark" className="pb-16 pt-32 sm:pt-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            dark
            title="场景演示"
            subtitle="四大核心医疗场景，端到端展示数智医院智能体的真实工作流"
          />
        </div>
      </GradientBackground>

      <section className="bg-[#F5F9FF] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeInOnScroll>
            <Collapse
              items={items}
              defaultActiveKey={['outpatient']}
              className="demo-scenario-collapse"
            />
          </FadeInOnScroll>

          <FadeInOnScroll className="mt-10 text-center">
            <p className="m-0 text-sm text-ink-secondary">想直接体验智能体能力？</p>
            <Link to="/demo/chat">
              <Button type="primary" size="large" className="mt-3">
                进入智能对话 Demo <ArrowRightOutlined />
              </Button>
            </Link>
          </FadeInOnScroll>
        </div>
      </section>
    </div>
  );
}
