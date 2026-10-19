/*
 * 健澜科技 jlmedaios - 住院床位微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.ward;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 住院床位微服务启动类（端口 9106）。
 */
@SpringBootApplication
public class JlmedaiosHisWardApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisWardApplication.class, args);
    }
}
