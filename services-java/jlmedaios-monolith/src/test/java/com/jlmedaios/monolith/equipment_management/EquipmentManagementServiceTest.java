/*
 * 健澜科技 jlmedaios - 设备管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management;

import com.jlmedaios.monolith.equipment_management.entity.EquipmentMaintenance;
import com.jlmedaios.monolith.equipment_management.service.EquipmentManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 设备管理 Service 测试。
 */
@SpringBootTest
public class EquipmentManagementServiceTest {

    @Autowired
    private EquipmentManagementService service;

    @Test
    void testRecordMaintenanceNormal() {
        EquipmentMaintenance m = service.recordMaintenance("EQ-001", "日常保养",
                "GE 医疗", new BigDecimal("5000.00"), LocalDate.now().plusMonths(6));
        assertNotNull(m.getId());
        assertEquals("日常保养", m.getMaintenanceType());
    }

    @Test
    void testEquipmentListNotNull() {
        assertNotNull(service.equipmentList());
    }

    @Test
    void testExpiringWarrantyNotNull() {
        assertNotNull(service.expiringWarranty());
    }
}
