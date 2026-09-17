/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 全局布局：侧边栏 + 顶部栏 + 主内容区（Outlet）
 */
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import SideMenu from './SideMenu';
import TopHeader from './TopHeader';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import { useAppStore } from '@/store/appStore';

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  const collapsed = useAppStore((s) => s.collapsed);

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        collapsedWidth={64}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="dark"
        style={{ background: 'linear-gradient(180deg, #0A4D8C 0%, #073A6B 100%)' }}
      >
        <div className="flex h-14 items-center justify-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-sm font-bold text-white">
            健
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap text-sm font-semibold tracking-wide text-white">
              健澜科技
            </span>
          )}
        </div>
        <SideMenu />
      </Sider>

      <Layout>
        <Header style={{ padding: 0, background: '#fff', height: 56, lineHeight: 'normal' }}>
          <TopHeader />
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 16,
            background: '#F5F7FA',
            borderRadius: 8,
            minHeight: 'calc(100vh - 88px)',
            overflow: 'auto',
          }}
        >
          <OfflineIndicator />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
