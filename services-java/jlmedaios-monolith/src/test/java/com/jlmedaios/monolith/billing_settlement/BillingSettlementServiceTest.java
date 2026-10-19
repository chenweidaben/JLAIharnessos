/*
 * 健澜科技 jlmedaios - 门诊结算 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_settlement;

import com.jlmedaios.monolith.billing_settlement.entity.ChargeOrder;
import com.jlmedaios.monolith.billing_settlement.service.BillingSettlementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 门诊结算 Service 测试。
 */
@SpringBootTest
public class BillingSettlementServiceTest {

    @Autowired
    private BillingSettlementService service;

    @Test
    void testCreateNormal() {
        ChargeOrder order = service.create("ORDER-001", "P001", "普通门诊", new BigDecimal("100.00"));
        assertNotNull(order.getId());
        assertEquals("UNPAID", order.getStatus());
        assertEquals(new BigDecimal("100.00"), order.getTotalAmount());
    }

    @Test
    void testPayNotFound() {
        Optional<ChargeOrder> result = service.pay(99999L, "微信");
        assertFalse(result.isPresent());
    }

    @Test
    void testTodayStatsNotNull() {
        var stats = service.todayStats();
        assertNotNull(stats);
        assertTrue(stats.containsKey("total_orders"));
    }
}
