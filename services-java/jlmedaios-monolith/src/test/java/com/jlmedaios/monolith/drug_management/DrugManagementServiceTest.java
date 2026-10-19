/*
 * 健澜科技 jlmedaios - 药品管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management;

import com.jlmedaios.monolith.drug_management.entity.DrugPurchase;
import com.jlmedaios.monolith.drug_management.service.DrugManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 药品管理 Service 测试。
 */
@SpringBootTest
public class DrugManagementServiceTest {

    @Autowired
    private DrugManagementService service;

    @Test
    void testCreatePurchaseNormal() {
        DrugPurchase purchase = service.createPurchase("PUR-001", "DRUG-001",
                100, new BigDecimal("5.00"), "国药控股");
        assertNotNull(purchase.getId());
        assertEquals("ORDERED", purchase.getStatus());
        assertEquals(new BigDecimal("500.00"), purchase.getTotalAmount());
    }

    @Test
    void testInboundNotFound() {
        Optional<DrugPurchase> result = service.inbound(99999L);
        assertFalse(result.isPresent());
    }

    @Test
    void testDrugListNotNull() {
        assertNotNull(service.drugList());
    }
}
