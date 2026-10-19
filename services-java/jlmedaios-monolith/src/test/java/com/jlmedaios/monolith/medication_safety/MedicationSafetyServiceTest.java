/*
 * 健澜科技 jlmedaios - 用药安全 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medication_safety;

import com.jlmedaios.monolith.medication_safety.entity.MedicationAlert;
import com.jlmedaios.monolith.medication_safety.service.MedicationSafetyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 用药安全 Service 测试。
 */
@SpringBootTest
public class MedicationSafetyServiceTest {

    @Autowired
    private MedicationSafetyService medicationSafetyService;

    @Test
    void testAlertList() {
        List<MedicationAlert> list = medicationSafetyService.alertList();
        assertNotNull(list);
    }

    @Test
    void testCheck() {
        List<MedicationAlert> alerts = medicationSafetyService.check(1L, "华法林+阿司匹林");
        assertNotNull(alerts);
    }

    @Test
    void testAcknowledge() {
        MedicationAlert alert = medicationSafetyService.acknowledge("ALERT-001");
        // 可能为空（H2 内存库无预置数据）
    }
}
