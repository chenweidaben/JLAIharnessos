/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 关于我们 / 联系我们：公司介绍 + 发展历程 + 联系方式 + 预约演示表单（Mock）
 */
import { useEffect } from 'react';
import { Button, Form, Input, message, Timeline } from 'antd';
import {
  EnvironmentFilled,
  MailFilled,
  PhoneFilled,
  GlobalOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import { companyInfo, companyMilestones, type BookingFormValues } from '@/mock/demoMock';

export default function AboutPage() {
  const [form] = Form.useForm<BookingFormValues>();
  const [msg, msgContext] = message.useMessage();

  useEffect(() => {
    document.title = '关于我们 · 健澜科技';
  }, []);

  const onFinish = (values: BookingFormValues) => {
    // Mock 提交：不连接后端，仅前端反馈
    msg.success(`感谢 ${values.name} 的预约！我们将在 1 个工作日内与您联系。`);
    form.resetFields();
  };

  return (
    <div>
      {msgContext}
      <GradientBackground variant="dark" className="pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="m-0 text-3xl font-bold text-white sm:text-4xl">关于健澜科技</h1>
          <p className="mt-3 max-w-2xl text-base text-white/80">
            {companyInfo.fullName}，{companyInfo.slogan}。{companyInfo.mission}。
          </p>
          <div className="mt-4 flex flex-wrap gap-6 text-white/80">
            <span className="flex items-center gap-2">
              <EnvironmentFilled /> {companyInfo.address}
            </span>
            <span className="flex items-center gap-2">
              <PhoneFilled /> {companyInfo.phone}
            </span>
            <span className="flex items-center gap-2">
              <MailFilled /> {companyInfo.email}
            </span>
            <span className="flex items-center gap-2">
              <GlobalOutlined /> {companyInfo.website}
            </span>
          </div>
        </div>
      </GradientBackground>

      {/* 使命愿景价值观 */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: '使命', desc: companyInfo.mission },
              { title: '愿景', desc: companyInfo.vision },
              { title: '价值观', desc: '以患者为中心、以医生为伙伴、以数据为驱动、以安全为底线。' },
            ].map((v, i) => (
              <FadeInOnScroll key={v.title} delay={i * 90}>
                <div className="h-full rounded-jl bg-[#F5F9FF] p-6">
                  <h3 className="m-0 text-lg font-bold text-jl-primary">{v.title}</h3>
                  <p className="m-0 mt-3 text-sm leading-relaxed text-[#3A4B66]">{v.desc}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 发展历程 + 预约表单 */}
      <section className="bg-[#F5F7FA] py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-8 lg:grid-cols-2">
          {/* 发展历程 */}
          <FadeInOnScroll>
            <SectionTitle align="left" title="发展历程" subtitle="从智能问诊到 AI 原生医院" />
            <Timeline
              className="mt-6"
              items={companyMilestones.map((m) => ({
                color: 'blue',
                children: (
                  <div>
                    <div className="font-semibold text-[#1A2B45]">
                      {m.year} · {m.title}
                    </div>
                    <div className="mt-1 text-sm text-ink-secondary">{m.desc}</div>
                  </div>
                ),
              }))}
            />
          </FadeInOnScroll>

          {/* 预约演示表单 */}
          <FadeInOnScroll delay={120}>
            <div className="rounded-jl bg-white p-6 shadow-card">
              <h3 className="m-0 mb-1 text-lg font-bold text-[#1A2B45]">预约产品演示</h3>
              <p className="m-0 mb-4 text-sm text-ink-secondary">
                留下您的信息，专属顾问将尽快与您联系。
              </p>
              <Form<BookingFormValues> form={form} layout="vertical" onFinish={onFinish}>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4">
                  <Form.Item
                    label="姓名"
                    name="name"
                    rules={[{ required: true, message: '请输入您的姓名' }]}
                  >
                    <Input placeholder="您的姓名" />
                  </Form.Item>
                  <Form.Item
                    label="医院名称"
                    name="hospital"
                    rules={[{ required: true, message: '请输入医院名称' }]}
                  >
                    <Input placeholder="所在医院" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4">
                  <Form.Item label="职位" name="title">
                    <Input placeholder="如：信息科主任" />
                  </Form.Item>
                  <Form.Item
                    label="联系电话"
                    name="phone"
                    rules={[{ required: true, message: '请输入联系电话' }]}
                  >
                    <Input placeholder="手机 / 座机" />
                  </Form.Item>
                </div>
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[{ type: 'email', message: '邮箱格式不正确' }]}
                >
                  <Input placeholder="name@hospital.com" />
                </Form.Item>
                <Form.Item label="需求描述" name="requirement">
                  <Input.TextArea rows={3} placeholder="请简要描述您的需求或关注的功能" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large">
                  提交预约
                </Button>
                <p className="mt-3 flex items-center gap-1 text-xs text-ink-secondary">
                  <CheckCircleFilled className="text-[#52C41A]" />
                  我们承诺保护您的信息安全，仅用于产品联系。
                </p>
              </Form>
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </div>
  );
}
