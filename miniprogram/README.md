# miniprogram — 微信患者端旁路/参考实现

健澜科技 jlmedaios 互联网医院患者端原生微信小程序（`miniprogram/`），角色为**旁路/参考**，不进入主线 docker-compose 编排，由微信开发者工具独立构建与预览。

## 角色边界

- 主线为 Bun + TypeScript BFF（`src/bff/`，端口 8080）+ React 工作台（`web/`）；本目录仅保留患者端页面参考实现。
- 本目录不参与仓库根目录 `docker-compose.yml` / `docker-compose.prod.yml` 的服务清单；无 `package.json`、无 Node 构建链路。
- 线上接入需替换真实 AppID、完成微信小程序备案与隐私协议配置，本仓库状态仅供本地预览与评审。

## 页面清单（`app.json` 注册 8 页）

| 页面路径 | 说明 |
|---|---|
| `pages/index/index` | 就诊人列表（tabBar） |
| `pages/login/index` | 登录页 |
| `pages/profile-add/index` | 添加就诊人（tabBar） |
| `pages/realname/index` | 实名认证 |
| `pages/profile-detail/index` | 就诊人详情 |
| `pages/consultation-list/index` | 问诊会话列表（tabBar） |
| `pages/consultation-start/index` | 发起问诊 |
| `pages/consultation-chat/index` | 问诊会话聊天页 |

## 构建前提

1. 安装 **微信开发者工具**（稳定版）；
2. 导入本目录；`project.config.json` 当前 AppID 为 `touristappid` 游客占位，预览真机时需替换为已注册的小程序 AppID；
3. 页面接口地址按院内部署环境在 `utils/` 内配置，指向主线 BFF 暴露的内网/网关地址；
4. 本目录依赖的后端接口归属主线 BFF，不在本目录内实现。

## 安全与合规提示

- 实名信息、手机号、身份证号等 PHI 字段在传输与存储侧由主线 BFF 统一脱敏与字段级加密；小程序端不得明文落盘敏感信息。
- 上线前需补齐小程序隐私协议、用户授权弹窗与内容安全审核链路。
