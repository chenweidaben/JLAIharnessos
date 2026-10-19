/*
 * 健澜科技 jlmedaios - 注册中心启动类（Eureka Server，替代 Nacos）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.registry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * 注册中心启动类。
 * 单机模式：register-with-eureka=false、fetch-registry=false。
 */
@SpringBootApplication
@EnableEurekaServer
public class JlmedaiosRegistryApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosRegistryApplication.class, args);
    }
}
