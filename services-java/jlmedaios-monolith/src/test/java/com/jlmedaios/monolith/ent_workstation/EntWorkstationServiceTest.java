/*
 * 健澜科技 jlmedaios - 耳鼻喉工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ent_workstation;

import com.jlmedaios.monolith.ent_workstation.entity.ENTRecord;
import com.jlmedaios.monolith.ent_workstation.service.EntWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 耳鼻喉工作站 Service 测试。
 */
@SpringBootTest
public class EntWorkstationServiceTest {

    @Autowired
    private EntWorkstationService entWorkstationService;

    @Test
    void testTodayPatients() {
        List<ENTRecord> list = entWorkstationService.todayPatients();
        assertNotNull(list);
    }

    @Test
    void testCreateExam() {
        ENTRecord record = entWorkstationService.createExam(
                "ENT-001", "P001", "鼻科", "鼻内镜", "双侧下鼻甲肥大");
        assertNotNull(record.getId());
    }

    @Test
    void testMakeDiagnosis() {
        ENTRecord record = entWorkstationService.makeDiagnosis(
                "ENT-001", "慢性鼻炎", "鼻用激素喷剂");
        assertNotNull(record);
    }

    @Test
    void testEntHistory() {
        List<ENTRecord> history = entWorkstationService.entHistory(1L);
        assertNotNull(history);
    }
}
