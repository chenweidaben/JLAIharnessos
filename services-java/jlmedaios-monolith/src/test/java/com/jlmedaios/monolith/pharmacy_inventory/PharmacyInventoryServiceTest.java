/*
 * 健澜科技 jlmedaios - 药房库存管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_inventory;

import com.jlmedaios.monolith.pharmacy_inventory.entity.DrugInventory;
import com.jlmedaios.monolith.pharmacy_inventory.service.PharmacyInventoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 药房库存管理 Service 测试。
 */
@SpringBootTest
public class PharmacyInventoryServiceTest {

    @Autowired
    private PharmacyInventoryService pharmacyInventoryService;

    @Test
    void testRestock() {
        DrugInventory drug = pharmacyInventoryService.restock(
                "D001", "阿莫西林", "0.25g*24", "石药", "B20260101",
                LocalDate.now().plusYears(2), 100, new BigDecimal("15.00"), 20, "A区01架"
        );
        assertNotNull(drug.getId());
        assertEquals(100, drug.getStockQuantity());
    }

    @Test
    void testLowStock() {
        pharmacyInventoryService.restock(
                "D002", "头孢呋辛", "0.5g*10", "国药", "B20260102",
                LocalDate.now().plusYears(1), 5, new BigDecimal("25.00"), 20, "A区02架"
        );
        assertNotNull(pharmacyInventoryService.lowStock());
    }

    @Test
    void testExpiringSoon() {
        pharmacyInventoryService.restock(
                "D003", "左氧氟沙星", "0.5g*6", "第一三共", "B20251001",
                LocalDate.now().plusDays(30), 50, new BigDecimal("35.00"), 10, "B区01架"
        );
        assertNotNull(pharmacyInventoryService.expiringSoon());
    }
}
