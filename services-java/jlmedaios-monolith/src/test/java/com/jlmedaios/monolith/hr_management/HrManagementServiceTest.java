/*
 * 健澜科技 jlmedaios - 人力资源管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management;

import com.jlmedaios.monolith.hr_management.service.HrManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 人力资源管理 Service 测试。
 */
@SpringBootTest
public class HrManagementServiceTest {

    @Autowired
    private HrManagementService service;

    @Test
    void testEmployeeListNotNull() {
        assertNotNull(service.employeeList());
    }

    @Test
    void testEmployeeDetailNotFound() {
        assertTrue(service.employeeDetail("不存在工号").isEmpty());
    }

    @Test
    void testTransferNotFound() {
        assertTrue(service.transfer("不存在工号", "新科室", "新岗位").isEmpty());
    }
}
