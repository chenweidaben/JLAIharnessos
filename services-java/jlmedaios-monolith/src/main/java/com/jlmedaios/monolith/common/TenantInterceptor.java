/*
 * 健澜科技 jlmedaios - 租户拦截器
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血】从 X-Tenant-Id Header 读取租户 ID，
 * 存入 TenantContext；请求结束后 clear()。
 */
package com.jlmedaios.monolith.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 租户拦截器。
 *
 * <p>从请求头 X-Tenant-Id 读取租户 ID。
 * 如果 JWT 里已有 tenant claim，JwtAuthenticationFilter 会覆盖。</p>
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(TenantInterceptor.class);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader("X-Tenant-Id");
        if (tenantId != null && !tenantId.isEmpty()) {
            TenantContext.setTenantId(tenantId);
            log.debug("[TenantInterceptor] tenantId={}", tenantId);
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // 请求结束必须清理 ThreadLocal，防止线程池复用泄漏
        TenantContext.clear();
    }
}
