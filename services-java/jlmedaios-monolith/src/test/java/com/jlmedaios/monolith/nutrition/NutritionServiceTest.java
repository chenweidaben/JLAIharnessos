/*
 * 健澜科技 jlmedaios - 营养 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition;

import com.jlmedaios.monolith.nutrition.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition.service.NutritionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 营养 Service 测试。
 */
@SpringBootTest
public class NutritionServiceTest {

    @Autowired
    private NutritionService nutritionService;

    @Test
    void testOrder() {
        NutritionOrder order = nutritionService.order(1L, "肠内营养",
                "糖尿病低盐", 1500, new BigDecimal("60.0"), LocalDate.now());
        assertNotNull(order.getId());
        assertEquals("ACTIVE", order.getStatus());
    }

    @Test
    void testListByPatient() {
        nutritionService.order(2L, "治疗膳食", "肾病低蛋白", 1200,
                new BigDecimal("40.0"), LocalDate.now());
        List<NutritionOrder> list = nutritionService.listByPatient(2L);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testComplete() {
        NutritionOrder order = nutritionService.order(3L, "肠外营养", "标准配方",
                1800, new BigDecimal("80.0"), LocalDate.now());
        Optional<NutritionOrder> completed = nutritionService.complete(order.getId());
        assertTrue(completed.isPresent());
        assertEquals("COMPLETED", completed.get().getStatus());
    }
}
