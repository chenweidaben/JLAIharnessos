/*
 * 健澜科技 jlmedaios - 眼科工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ophthalmology_workstation;

import com.jlmedaios.monolith.ophthalmology_workstation.entity.EyeExamRecord;
import com.jlmedaios.monolith.ophthalmology_workstation.service.OphthalmologyWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 眼科工作站 Service 测试。
 */
@SpringBootTest
public class OphthalmologyWorkstationServiceTest {

    @Autowired
    private OphthalmologyWorkstationService ophthalmologyWorkstationService;

    @Test
    void testTodayPatients() {
        List<EyeExamRecord> list = ophthalmologyWorkstationService.todayPatients();
        assertNotNull(list);
    }

    @Test
    void testCreateExam() {
        EyeExamRecord record = ophthalmologyWorkstationService.createExam(
                "EYE-001", "P001", "初诊", "0.8", "0.6",
                new BigDecimal("15.0"), new BigDecimal("16.0"),
                "晶状体透明", "视盘边界清");
        assertNotNull(record.getId());
    }

    @Test
    void testMakeDiagnosis() {
        EyeExamRecord record = ophthalmologyWorkstationService.makeDiagnosis(
                "EYE-001", "屈光不正", "OD:-2.00DS OS:-3.00DS");
        assertNotNull(record);
    }

    @Test
    void testEyeHistory() {
        List<EyeExamRecord> history = ophthalmologyWorkstationService.eyeHistory(1L);
        assertNotNull(history);
    }
}
