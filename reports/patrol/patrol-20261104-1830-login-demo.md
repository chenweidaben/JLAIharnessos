# 前端登录页接 demo-login 四角色 简报（18:30 轮）

## commit
- ae9b2735 feat(login): P0-7 前端收尾——登录页接入演示角色一键登录（4 文件 +267）

## 改动
- LoginPage.tsx：新增「演示角色」Tab，4 按钮（医生/护士/药师/管理员），2x2 深海蓝卡片
- services/api/auth.ts：demoLoginApi(role)
- store/authStore.ts：demoLogin action，复用 establishSession（tokenStorage 写入 + obfuscated persist + zustand + userStore）
- tests/pages/login-page-demo.test.tsx：2 用例

## demo-login 实测（curl nurse role）
HTTP 200，data.tokens.accessToken 为 HS256 JWT（sub:demo-nurse, name:演示护士, roles:["nurse"], permissions 细粒度权限数组）。非法 role=manager → 400 code=40000。

## 门禁（我本人复跑）
- web tsc exit 0 / 0 字节
- 子代理报告单测 39 pass / 0 fail（authApi 9 + authStore 28 + login-page-demo 2）
- 品牌 16 词逐文件 Ordinal 扫描 0 命中

## 路由确认
实际渲染 /login = web/src/pages/LoginPage.tsx（router/index.tsx:4889）；/login-legacy 旧版与 /m/login 移动端未动。

## 未动
后端/BFF/白名单/requireAuth；BFF pid 45856 未重启；Vite 5173 未动。