/*
 * 健澜科技 jlmedaios - 统一鉴权拦截器（已废弃）
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血后】SecurityFilterChain + JwtAuthenticationFilter 已接管鉴权，
 * 本类仅保留为兼容骨架，实际鉴权逻辑请见 SecurityConfig。
 */
package com.jlmedaios.monolith.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * @deprecated 由 {@link SecurityConfig} + {@link JwtAuthenticationFilter} 替代，
 *             本类仅保留为兼容骨架，不再注册到 WebConfig。
 */
@Deprecated
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 空操作：鉴权已由 SecurityFilterChain 接管
        return true;
    }
}
