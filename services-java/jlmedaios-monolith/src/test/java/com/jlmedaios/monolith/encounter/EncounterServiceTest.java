/*
 * 健澜科技 jlmedaios - 诊疗 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.encounter;

import com.jlmedaios.monolith.encounter.entity.EncounterRecord;
import com.jlmedaios.monolith.encounter.service.EncounterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 诊疗 Service 测试。
 */
@SpringBootTest
public class EncounterServiceTest {

    @Autowired
    private EncounterService encounterService;

    @Test
    void testRecordEncounter() {
        EncounterRecord record = encounterService.recordEncounter(1L, 1L, "INTERNAL",
                "张医生", "腹痛3天", "急性胃炎", "[]", "[]", "好转", 3);
        assertNotNull(record.getId());
        assertEquals("好转", record.getOutcome());
    }

    @Test
    void testGetEncounter() {
        EncounterRecord record = encounterService.recordEncounter(2L, 2L, "SURGERY",
                "王医生", "发现胆囊息肉", "胆囊息肉", "[]", "[]", "治愈", 5);
        Optional<EncounterRecord> found = encounterService.getEncounter(record.getId());
        assertTrue(found.isPresent());
        assertEquals("急性胃炎", found.get().getMainDiagnosis());
    }

    @Test
    void testListByPatient() {
        encounterService.recordEncounter(3L, 3L, "INTERNAL", "李医生", "头痛",
                "偏头痛", "[]", "[]", "好转", 2);
        List<EncounterRecord> list = encounterService.listByPatient(3L);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testGetStatistics() {
        Map<String, Object> stats = encounterService.getStatistics("INTERNAL");
        assertNotNull(stats);
        assertTrue((Integer) stats.get("total") >= 0);
    }
}
