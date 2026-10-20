/*
 * 健澜科技 jlmedaios - 租户上下文（ThreadLocal）
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血】多院区/多租户隔离基础：
 *   - 当前请求的 tenantId 存入 ThreadLocal
 *   - Repository 层后续基于此自动过滤
 */
package com.jlmedaios.monolith.common;

/**
 * 租户上下文 Holder（ThreadLocal）。
 *
 * <p>每个 HTTP 请求的 tenantId 由 TenantInterceptor 或 JwtAuthenticationFilter 设置，
 * 请求结束后必须 clear()，防止线程池复用泄漏。</p>
 */
public final class TenantContext {

    private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>();

    private TenantContext() {
    }

    public static String getTenantId() {
        return TENANT_ID.get();
    }

    public static void setTenantId(String tenantId) {
        TENANT_ID.set(tenantId);
    }

    public static void clear() {
        TENANT_ID.remove();
    }
}
