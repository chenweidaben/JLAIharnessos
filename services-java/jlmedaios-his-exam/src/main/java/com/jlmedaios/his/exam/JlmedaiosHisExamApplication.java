/*
 * 健澜科技 jlmedaios - 检查对接微服务启动类
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.exam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 检查对接微服务启动类（端口 9109）。
 * TODO: 对接 RIS/PACS HL7 v2.x / DICOM 接口。
 */
@SpringBootApplication
public class JlmedaiosHisExamApplication {

    public static void main(String[] args) {
        SpringApplication.run(JlmedaiosHisExamApplication.class, args);
    }
}
