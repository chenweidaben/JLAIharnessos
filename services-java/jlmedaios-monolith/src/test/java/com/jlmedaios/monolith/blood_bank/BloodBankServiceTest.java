/*
 * 健澜科技 jlmedaios - 血库管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank;

import com.jlmedaios.monolith.blood_bank.entity.BloodTransfusionOrder;
import com.jlmedaios.monolith.blood_bank.service.BloodBankService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 血库管理 Service 测试。
 */
@SpringBootTest
public class BloodBankServiceTest {

    @Autowired
    private BloodBankService bloodBankService;

    @Test
    void testOrder() {
        BloodTransfusionOrder order = bloodBankService.order(1L, "A+", 400, "急性失血");
        assertNotNull(order.getId());
        assertEquals("PENDING", order.getStatus());
    }

    @Test
    void testIssue() {
        BloodTransfusionOrder order = bloodBankService.order(2L, "O+", 200, "贫血");
        Optional<BloodTransfusionOrder> issued = bloodBankService.issue(order.getId());
        assertTrue(issued.isPresent());
        assertEquals("ISSUED", issued.get().getStatus());
        assertNotNull(issued.get().getIssueTime());
    }

    @Test
    void testInventory() {
        assertNotNull(bloodBankService.inventory());
    }

    @Test
    void testExpiringSoon() {
        assertNotNull(bloodBankService.expiringSoon());
    }
}
