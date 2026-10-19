/*
 * 健澜科技 jlmedaios - 出院结算微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.discharge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 出院结算微服务启动类（端口 9110）。
 */
@SpringBootApplication
public class JlmedaiosHisDischargeApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisDischargeApplication.class, args);
    }
}
