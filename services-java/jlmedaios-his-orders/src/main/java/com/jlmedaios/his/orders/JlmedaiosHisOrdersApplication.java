/*
 * 健澜科技 jlmedaios - 医嘱微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.orders;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 医嘱微服务启动类（端口 9103）。
 */
@SpringBootApplication
public class JlmedaiosHisOrdersApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisOrdersApplication.class, args);
    }
}
