/*
 * 健澜科技 jlmedaios - ICU 管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management;

import com.jlmedaios.monolith.icu_management.entity.ICUMonitoring;
import com.jlmedaios.monolith.icu_management.entity.ICUPatient;
import com.jlmedaios.monolith.icu_management.service.ICUManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ICU 管理 Service 测试。
 */
@SpringBootTest
public class IcuManagementServiceTest {

    @Autowired
    private ICUManagementService icuManagementService;

    @Test
    void testAdmit() {
        ICUPatient patient = icuManagementService.admit("P001", "ICU-01", "ARDS", "N001");
        assertNotNull(patient.getId());
        assertEquals("IN_BED", patient.getStatus());
    }

    @Test
    void testDischarge() {
        ICUPatient patient = icuManagementService.admit("P002", "ICU-02", "休克", "N002");
        Optional<ICUPatient> discharged = icuManagementService.discharge(patient.getId());
        assertTrue(discharged.isPresent());
        assertEquals("TRANSFERRED", discharged.get().getStatus());
    }

    @Test
    void testMonitorAndBedStatus() {
        ICUMonitoring monitoring = icuManagementService.monitor("P003", 85, "120/80",
                20, 98, new BigDecimal("36.5"));
        assertNotNull(monitoring.getId());

        Map<String, Object> bedStatus = icuManagementService.bedStatus();
        assertNotNull(bedStatus);
        assertTrue((Integer) bedStatus.get("total_beds") > 0);
    }
}
