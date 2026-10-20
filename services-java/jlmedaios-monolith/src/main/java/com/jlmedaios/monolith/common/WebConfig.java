/*
 * 健澜科技 jlmedaios - Web MVC 配置（注册拦截器）
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血】SecurityFilterChain 已接管鉴权，
 * 此处仅注册 TenantInterceptor（租户上下文）。
 * AuthInterceptor 已废弃（由 JwtAuthenticationFilter 替代）。
 */
package com.jlmedaios.monolith.common;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置类。
 *
 * <p>注册租户拦截器，对所有 /api/** 路径生效。</p>
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 租户拦截器：从 X-Tenant-Id Header 提取租户
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/health",
                        "/api/ping",
                        "/actuator/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**"
                );
    }
}
