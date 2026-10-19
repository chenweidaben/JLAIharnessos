/*
 * 健澜科技 jlmedaios - 挂号 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.reg;

import com.jlmedaios.monolith.reg.entity.Register;
import com.jlmedaios.monolith.reg.service.RegisterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 挂号 Service 测试。
 */
@SpringBootTest
class RegisterServiceTest {

    @Autowired
    private RegisterService registerService;

    @Test
    void testCreate() {
        Register reg = Register.builder()
                .patientName("测试患者")
                .deptCode("INTERNAL")
                .doctorName("测试医生")
                .appointmentDate(LocalDate.now())
                .build();
        Register saved = registerService.create(reg);
        assertTrue(saved.getId() > 0);
        assertEquals("BOOKED", saved.getStatus());
    }

    @Test
    void testGetById() {
        Register reg = Register.builder()
                .patientName("查询患者")
                .deptCode("SURGERY")
                .doctorName("查询医生")
                .appointmentDate(LocalDate.now())
                .build();
        Register saved = registerService.create(reg);
        Optional<Register> found = registerService.getById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("查询患者", found.get().getPatientName());
    }
}
