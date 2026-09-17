/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 页脚：产品链接 / 解决方案 / 公司信息 / 版权声明
 */
import { Link } from 'react-router-dom';
import { RobotOutlined } from '@ant-design/icons';

const productLinks = [
  { to: '/demo', label: '产品首页' },
  { to: '/demo/features', label: '核心功能' },
  { to: '/demo/scenarios', label: '场景演示' },
  { to: '/demo/data', label: '数据可视化' },
];

const solutionLinks = [
  { to: '/demo/patient', label: '患者 360 视图' },
  { to: '/demo/chat', label: '智能对话 Demo' },
  { to: '/demo/architecture', label: '技术架构' },
  { to: '/demo/about', label: '预约演示' },
];

export default function Footer() {
  return (
    <footer className="bg-[#062C52] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <RobotOutlined style={{ fontSize: 20 }} />
            </span>
            <span className="text-lg font-bold">健澜科技</span>
          </div>
          <p className="m-0 text-sm leading-relaxed text-white/60">
            AI 驱动的下一代智慧医院操作系统。让 AI 成为每位医生的专业副驾。
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold text-white/90">产品</h4>
          <ul className="m-0 list-none p-0">
            {productLinks.map((l) => (
              <li key={l.to} className="py-1">
                <Link to={l.to} className="text-sm text-white/60 no-underline hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold text-white/90">解决方案</h4>
          <ul className="m-0 list-none p-0">
            {solutionLinks.map((l) => (
              <li key={l.to} className="py-1">
                <Link to={l.to} className="text-sm text-white/60 no-underline hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold text-white/90">联系我们</h4>
          <ul className="m-0 list-none p-0 text-sm text-white/60">
            <li className="py-1">地址：浙江省杭州市余杭区未来科技城</li>
            <li className="py-1">电话：0571-8888-8888</li>
            <li className="py-1">邮箱：contact@jianlan.tech</li>
            <li className="py-1">官网：www.jianlan.tech</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/45 sm:flex-row sm:px-6 lg:px-8">
          <span>Copyright © 2026 杭州健澜科技有限公司 版权所有</span>
          <span>演示数据均为模拟数据，患者信息已脱敏</span>
        </div>
      </div>
    </footer>
  );
}
