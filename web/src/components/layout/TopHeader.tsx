/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 顶部栏：折叠按钮 / 面包屑 / 通知中心 / 用户菜单 / 主题切换
 */
import { Avatar, Badge, Breadcrumb, Dropdown, Input, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  BellOutlined,
  FullscreenOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '@/store/appStore';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore, selectUnreadCount } from '@/store/dashboardStore';
import { logoutApi } from '@/services/api/auth';
import { clickableProps } from '@/utils/a11y';

export default function TopHeader() {
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed, theme, setTheme } = useAppStore();
  const { user } = useUserStore();
  const unreadCount = useDashboardStore(selectUnreadCount);

  const handleLogout = async () => {
    await logoutApi();
    // useAuthStore.logout 会桥接清理 useUserStore / tokenStorage / 会话持久化
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <div className="flex h-14 items-center justify-between border-b border-ink-border bg-white px-4">
      <div className="flex items-center gap-4">
        <Tooltip title={collapsed ? '展开菜单' : '收起菜单'}>
          <span
            {...clickableProps(toggleCollapsed)}
            className="cursor-pointer text-base text-ink-secondary"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
        </Tooltip>
        <Breadcrumb items={[{ title: '健澜科技' }, { title: '数智医院智能体' }]} />
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索患者 / 病历号"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          allowClear
        />
        <Tooltip title="通知中心">
          <Badge count={unreadCount} size="small">
            <BellOutlined
              className="cursor-pointer text-base text-ink-secondary"
              {...clickableProps(() => navigate('/alerts'))}
            />
          </Badge>
        </Tooltip>
        <Tooltip title="全屏">
          <FullscreenOutlined
            className="cursor-pointer text-base text-ink-secondary"
            onClick={() => document.documentElement.requestFullscreen?.()}
          />
        </Tooltip>
        <Tooltip title={theme === 'light' ? '切换深色' : '切换浅色'}>
          <span
            {...clickableProps(() => setTheme(theme === 'light' ? 'dark' : 'light'))}
            className="cursor-pointer text-base text-ink-secondary"
          >
            {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          </span>
        </Tooltip>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex cursor-pointer items-center gap-2">
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#0A4D8C' }} />
            <span className="text-sm text-ink-primary">{user?.realName ?? '未登录'}</span>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
