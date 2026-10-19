/*
 * 健澜科技 jlmedaios - 营养科工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_workstation;

import com.jlmedaios.monolith.nutrition_workstation.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_workstation.service.NutritionWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 营养科工作站 Service 测试。
 */
@SpringBootTest
public class NutritionWorkstationServiceTest {

    @Autowired
    private NutritionWorkstationService nutritionWorkstationService;

    @Test
    void testTodayOrders() {
        List<NutritionOrder> list = nutritionWorkstationService.todayOrders();
        assertNotNull(list);
    }

    @Test
    void testIssueOrder() {
        NutritionOrder order = nutritionWorkstationService.issueOrder(
                "NUT-001", "P001", "糖尿病", "低盐低脂膳食", 1800, 75, LocalDate.now());
        assertNotNull(order.getId());
        assertEquals("ISSUED", order.getStatus());
    }

    @Test
    void testAdjustOrder() {
        NutritionOrder order = nutritionWorkstationService.adjustOrder(
                "NUT-001", "糖尿病治疗膳食", 1600, 70);
        assertNotNull(order);
    }

    @Test
    void testNutritionHistory() {
        List<NutritionOrder> history = nutritionWorkstationService.nutritionHistory(1L);
        assertNotNull(history);
    }
}
