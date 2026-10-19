/*
 * 健澜科技 jlmedaios - 营养管理深化 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_advanced;

import com.jlmedaios.monolith.nutrition_advanced.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_advanced.service.NutritionAdvancedService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 营养管理深化 Service 测试。
 */
@SpringBootTest
public class NutritionAdvancedServiceTest {

    @Autowired
    private NutritionAdvancedService nutritionAdvancedService;

    @Test
    void testCreateOrder() {
        NutritionOrder order = nutritionAdvancedService.createOrder("NO-001", "P001",
                "糖尿病餐", 1800, new BigDecimal("60.0"),
                LocalDate.now(), LocalDate.now().plusDays(7));
        assertNotNull(order.getId());
        assertEquals("ACTIVE", order.getStatus());
    }

    @Test
    void testTodayOrders() {
        nutritionAdvancedService.createOrder("NO-002", "P002", "半流质",
                1500, new BigDecimal("50.0"),
                LocalDate.now().minusDays(1), LocalDate.now().plusDays(3));
        List<NutritionOrder> orders = nutritionAdvancedService.todayOrders();
        assertNotNull(orders);
        assertTrue(orders.size() >= 1);
    }

    @Test
    void testPatientOrders() {
        List<NutritionOrder> orders = nutritionAdvancedService.patientOrders(1L);
        assertNotNull(orders);
    }
}
