/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控工作台主页面 - /quality
 * 含：质控任务、病案首页质控、核心制度质控、质控报表、整改反馈
 */
import { useState } from 'react';
import { Tabs } from 'antd';
import {
  AuditOutlined,
  SafetyCertificateOutlined,
  ReadOutlined,
  BarChartOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import {
  QualityDashboard,
  FrontPageQualityCheck,
  CoreSystemCheck,
  QualityReports,
  FeedbackRectification,
} from '@/components/quality';

export default function QualityWorkbench() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">医疗质量管理（质控）工作台</h2>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">
            依据《病历书写基本规范》《医疗质量管理办法》，覆盖运行病历、病案首页、核心制度与整改闭环
          </p>
        </div>
        <span className="text-xs text-ink-secondary">健澜科技 · 智枢质控</span>
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        size="middle"
        items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <AuditOutlined /> 质控任务工作台
              </span>
            ),
            children: <QualityDashboard />,
          },
          {
            key: 'frontpage',
            label: (
              <span>
                <ReadOutlined /> 病案首页质控
              </span>
            ),
            children: <FrontPageQualityCheck />,
          },
          {
            key: 'core',
            label: (
              <span>
                <SafetyCertificateOutlined /> 核心制度质控
              </span>
            ),
            children: <CoreSystemCheck />,
          },
          {
            key: 'reports',
            label: (
              <span>
                <BarChartOutlined /> 质控报表
              </span>
            ),
            children: <QualityReports />,
          },
          {
            key: 'rectify',
            label: (
              <span>
                <SolutionOutlined /> 整改反馈
              </span>
            ),
            children: <FeedbackRectification />,
          },
        ]}
      />
    </div>
  );
}
