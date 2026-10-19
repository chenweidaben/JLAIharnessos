/*
 * 健澜科技 jlmedaios - 医疗质量控制 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality;

import com.jlmedaios.monolith.medical_quality.entity.QualityCheckRecord;
import com.jlmedaios.monolith.medical_quality.service.MedicalQualityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医疗质量控制 Service 测试。
 */
@SpringBootTest
public class MedicalQualityServiceTest {

    @Autowired
    private MedicalQualityService service;

    @Test
    void testCreateCheckNormal() {
        QualityCheckRecord record = service.createCheck("CHK-001", "心内科",
                "质控办", "病历书写不规范", "限期整改");
        assertNotNull(record.getId());
        assertEquals("心内科", record.getDepartment());
    }

    @Test
    void testIndicatorListNotNull() {
        assertNotNull(service.indicatorList());
    }

    @Test
    void testStatsNotNull() {
        assertNotNull(service.stats());
    }
}
