/*
 * 健澜科技 jlmedaios - 耗材管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management;

import com.jlmedaios.monolith.material_management.entity.ConsumableUsage;
import com.jlmedaios.monolith.material_management.service.MaterialManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 耗材管理 Service 测试。
 */
@SpringBootTest
public class MaterialManagementServiceTest {

    @Autowired
    private MaterialManagementService service;

    @Test
    void testRecordUsageNormal() {
        ConsumableUsage usage = service.recordUsage("MAT-001", 10, "手术室", "张三", 1L);
        assertNotNull(usage.getId());
        assertEquals(10, usage.getQuantityUsed());
    }

    @Test
    void testUsageStatsNotNull() {
        var stats = service.usageStats();
        assertNotNull(stats);
        assertTrue(stats.containsKey("byDepartment"));
    }

    @Test
    void testMaterialListNotNull() {
        assertNotNull(service.materialList());
    }
}
