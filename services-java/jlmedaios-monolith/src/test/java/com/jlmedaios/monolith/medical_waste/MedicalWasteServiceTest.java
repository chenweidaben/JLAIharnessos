/*
 * 健澜科技 jlmedaios - 医疗废物 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_waste;

import com.jlmedaios.monolith.medical_waste.entity.WasteRecord;
import com.jlmedaios.monolith.medical_waste.service.MedicalWasteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医疗废物 Service 测试。
 */
@SpringBootTest
public class MedicalWasteServiceTest {

    @Autowired
    private MedicalWasteService medicalWasteService;

    @Test
    void testCreateRecord() {
        WasteRecord record = medicalWasteService.createRecord(
                "WASTE-2026-001", "感染性", new BigDecimal("5.50"), "心内科");
        assertNotNull(record.getId());
        assertEquals("STORED", record.getStatus());
    }

    @Test
    void testTransport() {
        WasteRecord record = medicalWasteService.createRecord(
                "WASTE-2026-002", "损伤性", new BigDecimal("2.00"), "普外科");
        Optional<WasteRecord> transported = medicalWasteService.transport(
                record.getId(), "环卫公司A", "处置中心B");
        assertTrue(transported.isPresent());
        assertEquals("TRANSPORTED", transported.get().getStatus());
        assertNotNull(transported.get().getCollectionDate());
    }

    @Test
    void testStats() {
        Map<String, Object> stats = medicalWasteService.stats();
        assertNotNull(stats);
        assertTrue(stats.containsKey("by_waste_type"));
        assertTrue(stats.containsKey("by_department"));
        assertTrue(stats.containsKey("by_month"));
    }
}
