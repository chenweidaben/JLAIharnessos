/*
 * 健澜科技 jlmedaios - 患者主索引微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.empi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 患者主索引（EMPI）微服务启动类（端口 9105）。
 */
@SpringBootApplication
public class JlmedaiosHisEmpiApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisEmpiApplication.class, args);
    }
}
