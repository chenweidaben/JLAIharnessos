/*
 * 健澜科技 jlmedaios - 患者主索引 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.empi;

import com.jlmedaios.monolith.empi.entity.Patient;
import com.jlmedaios.monolith.empi.service.EmpiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 患者主索引 Service 测试。
 */
@SpringBootTest
class EmpiServiceTest {

    @Autowired
    private EmpiService empiService;

    @Test
    void testRegister() {
        Patient patient = empiService.register(
                "测试患者",
                "男",
                "330106199901011111",
                "13900139000"
        );
        assertTrue(patient.getEmpiId() > 0);
        assertEquals("测试患者", patient.getName());
    }

    @Test
    void testGetByEmpiId() {
        Patient patient = empiService.register(
                "查询患者",
                "女",
                "330106199902022222",
                "13900139001"
        );
        Optional<Patient> found = empiService.getByEmpiId(patient.getEmpiId());
        assertTrue(found.isPresent());
        assertEquals("查询患者", found.get().getName());
    }

    @Test
    void testSearchByIdCard() {
        Optional<Patient> found = empiService.searchByIdCard("330106199001011234");
        // data.sql 已插入张三，身份证号 330106199001011234
        assertTrue(found.isPresent());
        assertEquals("张三", found.get().getName());
    }
}
