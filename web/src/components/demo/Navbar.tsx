/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 演示页导航栏：Logo + 导航链接 + CTA，滚动后变为白色吸顶，移动端汉堡菜单
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Drawer, Menu } from 'antd';
import { MenuOutlined, RobotOutlined } from '@ant-design/icons';

const navItems = [
  { key: '/demo', label: '产品首页' },
  { key: '/demo/features', label: '核心功能' },
  { key: '/demo/scenarios', label: '场景演示' },
  { key: '/demo/chat', label: '智能对话' },
  { key: '/demo/patient', label: '患者360' },
  { key: '/demo/data', label: '数据可视化' },
  { key: '/demo/architecture', label: '技术架构' },
  { key: '/demo/about', label: '关于我们' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 深色 Hero 上使用透明导航，滚动后白底
  const dark = !scrolled;

  const linkCls = (key: string) => {
    const active = location.pathname === key;
    const base = 'px-3 py-1.5 text-sm transition-colors whitespace-nowrap rounded-md';
    const color = dark
      ? active
        ? 'text-white font-medium bg-white/15'
        : 'text-white/80 hover:text-white hover:bg-white/10'
      : active
        ? 'text-jl-primary font-medium bg-[#EAF2FB]'
        : 'text-[#4A5B74] hover:text-jl-primary hover:bg-[#F0F6FC]';
    return `${base} ${color}`;
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        dark ? 'bg-transparent' : 'bg-white/90 shadow-sm backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/demo" className="flex items-center gap-2 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-jl-primary text-white">
            <RobotOutlined style={{ fontSize: 20 }} />
          </span>
          <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#1A2B45]'}`}>
            健澜科技
          </span>
          <span
            className={`hidden text-xs sm:inline ${dark ? 'text-white/60' : 'text-ink-secondary'}`}
          >
            数智医院智能体
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link key={item.key} to={item.key} className={linkCls(item.key)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/demo/chat">
            <Button type="primary" className="hidden sm:inline-flex">
              立即体验
            </Button>
          </Link>
          {/* 移动端汉堡 */}
          <button
            type="button"
            aria-label="打开菜单"
            onClick={() => setOpen(true)}
            className={`flex h-9 w-9 items-center justify-center rounded-md lg:hidden ${
              dark ? 'text-white hover:bg-white/10' : 'text-[#1A2B45] hover:bg-[#F0F6FC]'
            }`}
          >
            <MenuOutlined />
          </button>
        </div>
      </div>

      {/* 移动端抽屉 */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        width={280}
        title={<span className="font-bold text-[#1A2B45]">健澜科技 · 产品演示</span>}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems.map((n) => ({ key: n.key, label: n.label }))}
          onClick={() => setOpen(false)}
        />
        <Link to="/demo/chat" onClick={() => setOpen(false)}>
          <Button type="primary" block className="mt-4">
            立即体验
          </Button>
        </Link>
      </Drawer>
    </header>
  );
}
