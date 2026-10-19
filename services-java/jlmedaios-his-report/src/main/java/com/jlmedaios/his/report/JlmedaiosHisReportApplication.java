/*
 * 健澜科技 jlmedaios - 报表统计微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.report;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 报表统计微服务启动类（端口 9111）。
 * 纯 mock 报表，不依赖数据库。
 */
@SpringBootApplication
public class JlmedaiosHisReportApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisReportApplication.class, args);
    }
}
