/*
 * 健澜科技 jlmedaios - 手术 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery;

import com.jlmedaios.monolith.surgery.entity.SurgeryRecord;
import com.jlmedaios.monolith.surgery.service.SurgeryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 手术 Service 测试。
 */
@SpringBootTest
public class SurgeryServiceTest {

    @Autowired
    private SurgeryService surgeryService;

    @Test
    void testSchedule() {
        SurgeryRecord record = surgeryService.schedule(1L, "阑尾切除术",
                "张医生", "李麻醉");
        assertNotNull(record.getId());
        assertEquals("SCHEDULED", record.getStatus());
    }

    @Test
    void testStartAndFinish() {
        SurgeryRecord record = surgeryService.schedule(2L, "胆囊切除术",
                "王医生", "赵麻醉");
        Optional<SurgeryRecord> started = surgeryService.start(record.getId());
        assertTrue(started.isPresent());
        assertEquals("IN_PROGRESS", started.get().getStatus());
        assertNotNull(started.get().getStartTime());

        Optional<SurgeryRecord> finished = surgeryService.finish(record.getId());
        assertTrue(finished.isPresent());
        assertEquals("FINISHED", finished.get().getStatus());
        assertNotNull(finished.get().getEndTime());
    }

    @Test
    void testTodayListEmpty() {
        List<SurgeryRecord> list = surgeryService.today();
        assertNotNull(list);
        // 今日手术列表可能为空（H2 内存库）
    }
}
