# 健澜科技 jlmedaios - CSRF / Session 诊断报告

**日期**：2026-10-19
**类型**：只读诊断（不修改代码）
**问题**：前端登录后不跳转

---

## 1. CSRF 配置诊断

### 配置位置
`src/bff/middleware/csrf.ts`

### 工作模式
**"双重提交 Cookie + Token"** 模式：
- 登录时下发 `csrf-token` cookie
- 状态变更请求（POST/PUT/DELETE）需携带 `X-CSRF-Token` header
- 且与 cookie 中值一致

### 关键发现
| 配置项 | 值 | 影响 |
|---|---|---|
| GET/HEAD/OPTIONS | 不校验 | ✅ 只读请求不受影响 |
| 无 Cookie 请求 | **直接放行**（第 38 行 `if (!cookieHeader) return null`） | ✅ Bearer Token 模式下 CSRF 不生效 |
| CSRF token 生成方式 | `crypto.randomBytes(16).toString('hex')` | 每次登录随机生成 |
| 登录路由是否豁免 | 不需要（POST /auth/login 无 Cookie 时直接放行） | ✅ 登录本身不受 CSRF 拦截 |

**结论**：**CSRF 不是登录后不跳转的根因**。当前 Bearer Token 模式下，浏览器不自动携带 Cookie，CSRF 中间件直接放行所有请求。

---

## 2. JWT Secret 诊断

### 配置位置
`src/bff/middleware/auth.ts`（第 46-54 行）

### 工作方式
```typescript
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[security] JWT_SECRET 未设置，使用开发态默认密钥');
    return 'dev-only-insecure-jwt-secret-change-me';
  }
  return secret;
}
```

### 关键发现
| 配置项 | 值 | 影响 |
|---|---|---|
| JWT_SECRET 来源 | 环境变量 `JWT_SECRET` | ✅ |
| 未设置时默认值 | `dev-only-insecure-jwt-secret-change-me`（**固定字符串**） | ✅ 不是随机生成 |
| BFF 重启后旧 token | **仍可验证**（secret 没变） | ✅ 不会导致 session 失效 |

**结论**：**JWT Secret 不是登录后不跳转的根因**。默认密钥是固定字符串，BFF 重启后旧 token 仍然有效。

---

## 3. 可能导致"登录后不跳转"的根因分析

### 假设 1：前端登录响应格式不匹配（最可能）
- BFF 返回格式：`{ code: 0, message: "ok", data: { tokens: {...}, user: {...} } }`
- 前端可能期望：`{ accessToken: "...", refreshToken: "..." }`（扁平结构）
- 如果前端解析失败，就不会存储 token，也不会跳转

### 假设 2：token 存储失败
- 前端使用 localStorage / cookie 存储 token
- 如果浏览器禁用 localStorage 或 cookie，token 存储失败 → 跳转后立即被 AuthGuard 拦截回登录页

### 假设 3：路由跳转逻辑 bug
- 登录成功后应该跳转到 `/dashboard` 或 `/`
- 如果跳转路径错误，可能跳到了空白页或 404

### 假设 4：Vite proxy 问题
- 登录请求通过 Vite proxy 转发到 BFF
- 如果 proxy 配置有误，响应可能被截断或修改

---

## 4. 建议排查方向（前端线）

1. **检查浏览器 Network 面板**：
   - `/api/v1/auth/login` 的响应状态码和响应体
   - 确认响应格式是否与前端期望一致

2. **检查 Console 报错**：
   - 是否有 `Cannot read property 'xxx' of undefined` 等解析错误
   - 是否有 localStorage / cookie 存储报错

3. **检查前端登录代码**：
   - 登录成功后调用了什么函数跳转？
   - token 存储到哪里？
   - 跳转路径是什么？

4. **Vite proxy 验证**：
   - 确认 `/api` 代理目标是 `http://127.0.0.1:8080`
   - 确认响应没有被 rewrite

---

## 5. 后端确认事项

| 检查项 | 结果 |
|---|---|
| 登录接口是否正常返回 200？ | ✅ curl 测试验证通过 |
| JWT token 是否正确签发？ | ✅ token 可解码，含 permissions = ['*'] |
| CSRF 是否拦截了登录后的请求？ | ❌ 不会（无 Cookie 时直接放行） |
| BFF 重启是否会导致旧 token 失效？ | ❌ 不会（JWT secret 是固定默认值） |

---

## 6. 总结

**后端侧无问题**：
- CSRF 中间件在 Bearer Token 模式下不生效
- JWT secret 是固定默认值，重启不影响旧 token
- 登录接口 curl 测试正常返回 200 + token

**问题大概率在前端**：
- 登录响应格式解析
- token 存储
- 路由跳转逻辑
