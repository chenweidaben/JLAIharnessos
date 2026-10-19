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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 挂号 Service 测试。
 */
@SpringBootTest
public class RegServiceTest {

    @Autowired
    private RegisterService registerService;

    @Test
    void testRegister() {
        Register reg = registerService.register(1L, "INTERNAL", "张医生");
        assertNotNull(reg.getId());
        assertNotNull(reg.getRegisterNo());
    }

    @Test
    void testListByPatient() {
        registerService.register(2L, "SURGERY", "王医生");
        List<Register> list = registerService.listByPatient(2L);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testListEmpty() {
        List<Register> list = registerService.listByPatient(9999L);
        assertNotNull(list);
        assertEquals(0, list.size());
    }
}
