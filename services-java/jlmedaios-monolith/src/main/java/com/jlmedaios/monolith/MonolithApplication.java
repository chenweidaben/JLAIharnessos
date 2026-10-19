/*
 * 健澜科技 jlmedaios - 模块化单体启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 模块化单体启动类（端口 9090）。
 *
 * <p>包结构：com.jlmedaios.monolith.{reg,charge,orders,pharmacy,empi,ward,lis,nursing,discharge}
 * 模块间不互相 import（Spring Modulith 规则），只通过 Controller 暴露 HTTP 接口。</p>
 */
@SpringBootApplication
public class MonolithApplication {

    public static void main(String[] args) {
        SpringApplication.run(MonolithApplication.class, args);
    }
}
