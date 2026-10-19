/*
 * 健澜科技 jlmedaios - 收费微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.charge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 收费微服务启动类（端口 9102）。
 */
@SpringBootApplication
public class JlmedaiosHisChargeApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisChargeApplication.class, args);
    }
}
