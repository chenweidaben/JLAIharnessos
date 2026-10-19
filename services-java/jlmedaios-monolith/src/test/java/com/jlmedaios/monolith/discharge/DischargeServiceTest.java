/*
 * 健澜科技 jlmedaios - 出院结算 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.discharge;

import com.jlmedaios.monolith.discharge.entity.DischargeOrder;
import com.jlmedaios.monolith.discharge.service.DischargeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 出院结算 Service 测试。
 */
@SpringBootTest
class DischargeServiceTest {

    @Autowired
    private DischargeService dischargeService;

    @Test
    void testApply() {
        DischargeOrder order = dischargeService.apply(1001L);
        assertTrue(order.getId() > 0);
        assertEquals("APPLIED", order.getStatus());
    }

    @Test
    void testSettle() {
        dischargeService.apply(1002L);
        Optional<DischargeOrder> settled = dischargeService.settle(1002L);
        assertTrue(settled.isPresent());
        assertEquals("SETTLED", settled.get().getStatus());
        assertTrue(settled.get().getTotalAmount().doubleValue() >= 1000);
    }
}
