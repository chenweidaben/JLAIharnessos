/*
 * 健澜科技 jlmedaios - Spring Security 配置
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血】统一鉴权入口：
 *   - JWT 无状态认证
 *   - 白名单放行 /h2-console、/actuator/health、swagger
 *   - PHI 端点按 URL 规则区分角色
 */
package com.jlmedaios.monolith.common;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 配置。
 *
 * <p>JWT 无状态模式，前后端分离，CSRF 关闭。</p>
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 关闭（前后端分离，JWT 模式）
            .csrf(csrf -> csrf.disable())
            // 无 session（STATELESS）
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 鉴权规则
            .authorizeHttpRequests(auth -> auth
                // 白名单
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/health", "/api/ping").permitAll()

                // PHI 端点按 URL 规则区分角色
                .requestMatchers("/api/patient/**").hasAnyRole("PATIENT", "DOCTOR", "NURSE", "PHARMACIST", "ADMIN")
                .requestMatchers("/api/order/**").hasAnyRole("DOCTOR", "NURSE", "PHARMACIST", "ADMIN")
                .requestMatchers("/api/result/**").hasAnyRole("DOCTOR", "TECHNICIAN", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // 其余 /api/** 已认证即可
                .requestMatchers("/api/**").authenticated()

                // 其他全部放行（静态资源等）
                .anyRequest().permitAll()
            )
            // JWT 过滤器加在 UsernamePasswordAuthenticationFilter 之前
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // H2 Console 需要 frameOptions 关闭（否则浏览器 iframe 被拦截）
        http.headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }
}
