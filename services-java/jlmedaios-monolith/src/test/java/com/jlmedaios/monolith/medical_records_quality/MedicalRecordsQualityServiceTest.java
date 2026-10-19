/*
 * 健澜科技 jlmedaios - 病历质控 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_quality;

import com.jlmedaios.monolith.medical_records_quality.entity.MRQCRecord;
import com.jlmedaios.monolith.medical_records_quality.service.MedicalRecordsQualityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 病历质控 Service 测试。
 */
@SpringBootTest
public class MedicalRecordsQualityServiceTest {

    @Autowired
    private MedicalRecordsQualityService medicalRecordsQualityService;

    @Test
    void testCheckRecord() {
        MRQCRecord record = medicalRecordsQualityService.checkRecord(
                "MRQC-2026-001", "MR-001", "CARD", "运行病历质控",
                "[{\"item\":\"主诉\",\"pass\":true},{\"item\":\"现病史\",\"pass\":false}]");
        assertNotNull(record.getId());
        assertEquals("QC_PASSED", record.getStatus());
        assertEquals(8, record.getPassedCount());
        assertEquals(2, record.getFailedCount());
    }

    @Test
    void testRectify() {
        MRQCRecord record = medicalRecordsQualityService.checkRecord(
                "MRQC-2026-002", "MR-002", "GEN", "终末病历质控",
                "[{\"item\":\"过敏史\",\"pass\":false}]");
        Optional<MRQCRecord> rectified = medicalRecordsQualityService.rectify(record.getId());
        assertTrue(rectified.isPresent());
        assertEquals("RECTIFY", rectified.get().getStatus());
    }

    @Test
    void testStats() {
        Map<String, Object> stats = medicalRecordsQualityService.stats();
        assertNotNull(stats);
        assertTrue(stats.containsKey("total"));
        assertTrue(stats.containsKey("passed"));
        assertTrue(stats.containsKey("rectify_rate"));
    }

    @Test
    void testPendingListEmpty() {
        List<MRQCRecord> list = medicalRecordsQualityService.pendingList();
        assertNotNull(list);
    }
}
