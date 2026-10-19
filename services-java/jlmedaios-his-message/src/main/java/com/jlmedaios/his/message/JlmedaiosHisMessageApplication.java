/*
 * 健澜科技 jlmedaios - 消息通知微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.message;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 消息通知微服务启动类（端口 9112）。
 */
@SpringBootApplication
public class JlmedaiosHisMessageApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisMessageApplication.class, args);
    }
}
