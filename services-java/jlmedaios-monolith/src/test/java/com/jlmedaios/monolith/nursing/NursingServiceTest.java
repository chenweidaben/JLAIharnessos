/*
 * 健澜科技 jlmedaios - 护理执行 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing;

import com.jlmedaios.monolith.nursing.entity.NursingOrder;
import com.jlmedaios.monolith.nursing.service.NursingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 护理执行 Service 测试。
 */
@SpringBootTest
class NursingServiceTest {

    @Autowired
    private NursingService nursingService;

    @Test
    void testCreate() {
        NursingOrder order = NursingOrder.builder()
                .patientId(1L)
                .nursingType("DAILY")
                .content("每日体温测量")
                .build();
        NursingOrder saved = nursingService.create(order);
        assertTrue(saved.getId() > 0);
        assertEquals("PENDING", saved.getStatus());
    }

    @Test
    void testExecute() {
        NursingOrder order = NursingOrder.builder()
                .patientId(2L)
                .nursingType("INJECTION")
                .content("静脉输液")
                .build();
        NursingOrder saved = nursingService.create(order);
        Optional<NursingOrder> executed = nursingService.execute(saved.getId(), "张护士");
        assertTrue(executed.isPresent());
        assertEquals("EXECUTED", executed.get().getStatus());
        assertEquals("张护士", executed.get().getNurseName());
    }
}
