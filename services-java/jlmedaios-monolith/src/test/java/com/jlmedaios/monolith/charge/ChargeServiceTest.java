/*
 * 健澜科技 jlmedaios - 收费 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.charge;

import com.jlmedaios.monolith.charge.entity.Charge;
import com.jlmedaios.monolith.charge.service.ChargeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 收费 Service 测试。
 */
@SpringBootTest
class ChargeServiceTest {

    @Autowired
    private ChargeService chargeService;

    @Test
    void testCreate() {
        Charge charge = Charge.builder()
                .registerId(1L)
                .itemName("测试项目")
                .amount(new BigDecimal("100.00"))
                .build();
        Charge saved = chargeService.create(charge);
        assertTrue(saved.getId() > 0);
        assertEquals("UNPAID", saved.getPayStatus());
    }

    @Test
    void testGetByRegisterId() {
        Charge charge = Charge.builder()
                .registerId(999L)
                .itemName("查询项目")
                .amount(new BigDecimal("50.00"))
                .build();
        chargeService.create(charge);
        List<Charge> list = chargeService.getByRegisterId(999L);
        assertTrue(list.size() > 0);
        assertEquals("查询项目", list.get(0).getItemName());
    }
}
