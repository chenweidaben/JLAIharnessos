/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 主页面
 * 医生登录后的首页：今日工作概览、待办任务、危急值提醒、数据统计
 */

import { useEffect, useCallback, useState } from 'react';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import { useDashboardStore } from '@/store/dashboardStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { TodoList } from '@/components/dashboard/TodoList';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { QuickAccess } from '@/components/dashboard/QuickAccess';
import { SystemAnnouncement } from '@/components/dashboard/SystemAnnouncement';
import { DoctorProfileCard } from '@/components/dashboard/DoctorProfile';

/** 根据当前时间获取问候语 */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/** 格式化日期显示 */
function formatToday(): string {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

export const DashboardPage: React.FC = () => {
  const data = useDashboardStore((s) => s.data);
  const loading = useDashboardStore((s) => s.loading);
  const lastUpdated = useDashboardStore((s) => s.lastUpdated);
  const fetchDashboardData = useDashboardStore((s) => s.fetchDashboardData);
  const [refreshing, setRefreshing] = useState(false);

  // 初次加载
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 自动刷新：每60秒刷新待办和危急值
  useEffect(() => {
    const timer = setInterval(() => {
      useDashboardStore.getState().fetchTodos();
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshing(false), 400);
  }, [fetchDashboardData]);

  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-5">
        {/* ====== 顶部欢迎区 ====== */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[#0A4D8C] to-[#1565B8] p-6 text-white shadow-lg">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}，{data.doctorProfile.name}医生
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              {data.doctorProfile.department} · {data.doctorProfile.title} · {formatToday()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 最后更新时间 */}
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-blue-100">
              <ClockCircleOutlined />
              最后更新:{' '}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </div>
            {/* 手动刷新 */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/25 disabled:opacity-50"
            >
              <ReloadOutlined className={clsx(refreshing && 'animate-spin')} />
              {refreshing ? '刷新中...' : '刷新'}
            </button>
          </div>
        </div>

        {/* ====== 数据概览卡片行 ====== */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {data.stats.map((stat) => (
            <StatCard key={stat.key} data={stat} />
          ))}
        </div>

        {/* ====== 中部：图表区 + 待办/通知 ====== */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* 左侧：趋势图表（占2列） */}
          <div className="xl:col-span-2">
            <TrendCharts
              visitTrend={data.visitTrend}
              departmentLoad={data.departmentLoad}
              waitingTimes={data.waitingTimes}
            />
          </div>

          {/* 右侧：待办事项 */}
          <div className="xl:col-span-1">
            <TodoList />
          </div>
        </div>

        {/* ====== 通知中心 + 医生信息 ====== */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NotificationCenter />
          </div>
          <div className="lg:col-span-1">
            <DoctorProfileCard profile={data.doctorProfile} />
          </div>
        </div>

        {/* ====== 底部：快捷入口 + 系统公告 ====== */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickAccess items={data.quickAccess} recentPatients={data.recentPatients} />
          </div>
          <div className="lg:col-span-1">
            <SystemAnnouncement announcements={data.announcements} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
