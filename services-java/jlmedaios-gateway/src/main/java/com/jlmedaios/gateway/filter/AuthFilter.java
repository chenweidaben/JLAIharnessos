/*
 * 健澜科技 jlmedaios - 统一鉴权过滤器（GlobalFilter）
 *
 * 简单实现：检查请求头 X-Auth-Token 是否存在，不存在返回 401，存在则放行。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * 统一鉴权过滤器。
 * 检查请求头 X-Auth-Token；缺失返回 401 JSON。
 */
@Component
public class AuthFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders().getFirst("X-Auth-Token");
        if (token == null || token.isBlank()) {
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
            String body = "{\"code\":401,\"message\":\"缺少 X-Auth-Token 请求头\",\"data\":null}";
            DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
            return response.writeWith(Mono.just(buffer));
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
