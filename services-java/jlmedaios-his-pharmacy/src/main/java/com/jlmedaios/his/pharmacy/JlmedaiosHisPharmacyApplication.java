/*
 * 健澜科技 jlmedaios - 药房微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 药房微服务启动类（端口 9104）。
 */
@SpringBootApplication
public class JlmedaiosHisPharmacyApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisPharmacyApplication.class, args);
    }
}
