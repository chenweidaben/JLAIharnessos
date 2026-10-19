/*
 * 健澜科技 jlmedaios - 检验对接微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.lis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 检验对接微服务启动类（端口 9107）。
 * TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口。
 */
@SpringBootApplication
public class JlmedaiosHisLisApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisLisApplication.class, args);
    }
}
