/*
 * 健澜科技 jlmedaios - 护理记录 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_record;

import com.jlmedaios.monolith.nursing_record.entity.NursingRecord;
import com.jlmedaios.monolith.nursing_record.service.NursingRecordService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 护理记录 Service 测试。
 */
@SpringBootTest
public class NursingRecordServiceTest {

    @Autowired
    private NursingRecordService nursingRecordService;

    @Test
    void testCreate() {
        NursingRecord record = nursingRecordService.create(1L, "WARD01",
                "体温单", "T 36.5℃ P 78次/分 R 18次/分", "NURSE001");
        assertNotNull(record.getId());
        assertEquals("WARD01", record.getWardCode());
    }

    @Test
    void testListByPatient() {
        nursingRecordService.create(2L, "WARD02", "护理记录",
                "患者主诉无不适", "NURSE002");
        List<NursingRecord> list = nursingRecordService.listByPatient(2L);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testTodayWard() {
        nursingRecordService.create(3L, "WARD03", "交班报告",
                "夜间平稳", "NURSE003");
        List<NursingRecord> list = nursingRecordService.todayWard("WARD03");
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }
}
