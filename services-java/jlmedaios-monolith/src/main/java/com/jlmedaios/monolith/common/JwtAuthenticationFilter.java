/*
 * 健澜科技 jlmedaios - JWT 认证过滤器
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P0 安全止血】从 Authorization: Bearer <token> 解析 JWT，
 * 提取 roles / permissions / tenant 到 SecurityContext。
 */
package com.jlmedaios.monolith.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JWT 认证过滤器。
 *
 * <p>每个请求只执行一次。Token 解析失败时不抛异常，直接放行
 * （后续 SecurityFilterChain 会因无 authentication 而拒绝）。</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    // 密钥必须由环境变量 JLMEDAIOS_SECURITY_JWT_SECRET 注入；未配置时启动即失败（fail-closed），不内置开发默认口令。
    @Value("${jlmedaios.security.jwt.secret}")
    private String jwtSecret;

    private SecretKey getSigningKey() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT secret 未配置：请设置环境变量 JLMEDAIOS_SECURITY_JWT_SECRET");
        }
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(getSigningKey())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String username = claims.getSubject();
                String rolesClaim = claims.get("roles", String.class);
                String permissionsClaim = claims.get("permissions", String.class);
                String tenantId = claims.get("tenant", String.class);

                // 构建 authorities
                List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
                if (rolesClaim != null && !rolesClaim.isEmpty()) {
                    authorities.addAll(Arrays.stream(rolesClaim.split(","))
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.trim()))
                            .collect(Collectors.toList()));
                }
                if (permissionsClaim != null && !permissionsClaim.isEmpty()) {
                    authorities.addAll(Arrays.stream(permissionsClaim.split(","))
                            .map(perm -> new SimpleGrantedAuthority(perm.trim()))
                            .collect(Collectors.toList()));
                }

                // 存入 SecurityContext
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(username, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // 存入租户上下文
                if (tenantId != null && !tenantId.isEmpty()) {
                    TenantContext.setTenantId(tenantId);
                }

            } catch (Exception e) {
                // 解析失败不抛异常，放行后由 SecurityFilterChain 拒绝
                log.debug("[JwtAuthenticationFilter] Token 解析失败: {}", e.getMessage());
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // 请求结束清空租户上下文（防止线程池复用泄漏）
            TenantContext.clear();
        }
    }
}
