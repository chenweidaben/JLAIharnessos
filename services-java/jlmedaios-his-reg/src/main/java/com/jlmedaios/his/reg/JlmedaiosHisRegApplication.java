/*
 * 健澜科技 jlmedaios - 挂号微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.reg;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 挂号微服务启动类（端口 9101）。
 */
@SpringBootApplication
public class JlmedaiosHisRegApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisRegApplication.class, args);
    }
}
