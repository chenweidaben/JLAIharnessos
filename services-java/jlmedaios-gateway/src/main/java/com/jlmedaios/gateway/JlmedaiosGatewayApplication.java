/*
 * 健澜科技 jlmedaios - API 网关启动类（Spring Cloud Gateway，替代 APISIX）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * API 网关启动类。
 * 路由：/api/his/register/** → 9101；/api/his/charge/** → 9102。
 */
@SpringBootApplication
public class JlmedaiosGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosGatewayApplication.class, args);
    }
}
