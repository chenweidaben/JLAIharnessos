# 浏览器测试状态报告

**日期**：2026-10-19
**测试环境**：http://localhost:5173

---

## 1. 已验证通过

| 项目 | 状态 |
|---|---|
| BFF 登录接口 | ✅ 5 个账号全部登录成功 |
| dashboard/stats 接口 | ✅ 401（鉴权生效） |
| e2e 测试脚本 | ✅ 14/14 接口通过 |
| tsc 类型检查 | ✅ 根目录 + web 目录双零错误 |

---

## 2. 正在修复的问题

| 问题 | 根因 | 状态 |
|---|---|---|
| 部分路由访问后跳转 /403 | 前端 authStore 权限状态可能未正确初始化 | 待前端线验证 |
| /patients 等页面加载 | 组件文件存在，可能是路由守卫或缓存问题 | 待前端线验证 |

---

## 3. 待测试的页面

- dashboard（首页看板）
- patients（患者列表）
- emr（电子病历）
- orders（医嘱管理）
- emergency（急诊分诊）
- pharmacy（药房发药）
- surgery（手术排程）
- settlement（结算报表）
- quality（质量控制）
- admin（管理后台）

---

## 4. 已知限制

- 演示模式下部分页面数据为空（VITE_DEMO_MODE=0）
- 图表组件需要 ECharts 加载
- 打印功能需要浏览器打印权限
- 多角色权限测试需要切换账号重新登录

---

## 5. 建议操作

1. 清除浏览器 localStorage 后用 admin 重新登录
2. 验证 permissions 是否正确加载（Console: useAuthStore.getState().permissions）
3. 逐个页面验证路由跳转
