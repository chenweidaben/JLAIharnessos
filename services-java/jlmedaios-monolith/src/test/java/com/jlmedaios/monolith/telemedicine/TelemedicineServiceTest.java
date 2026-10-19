/*
 * 健澜科技 jlmedaios - 远程医疗 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.telemedicine;

import com.jlmedaios.monolith.telemedicine.entity.TelemedicineVisit;
import com.jlmedaios.monolith.telemedicine.service.TelemedicineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 远程医疗 Service 测试。
 */
@SpringBootTest
public class TelemedicineServiceTest {

    @Autowired
    private TelemedicineService telemedicineService;

    @Test
    void testCreateVisit() {
        TelemedicineVisit visit = telemedicineService.createVisit(
                "TM-2026-001", "P001", "D001", "心内科", "视频问诊");
        assertNotNull(visit.getId());
        assertEquals("WAITING", visit.getStatus());
    }

    @Test
    void testStartAndEndVisit() {
        TelemedicineVisit visit = telemedicineService.createVisit(
                "TM-2026-002", "P002", "D002", "普外科", "图文问诊");
        Optional<TelemedicineVisit> started = telemedicineService.startVisit(visit.getId());
        assertTrue(started.isPresent());
        assertEquals("IN_PROGRESS", started.get().getStatus());

        Optional<TelemedicineVisit> ended = telemedicineService.endVisit(
                visit.getId(), 15, true);
        assertTrue(ended.isPresent());
        assertEquals("ENDED", ended.get().getStatus());
        assertEquals(15, ended.get().getDurationMinutes());
        assertTrue(ended.get().getPrescriptionIssued());
    }

    @Test
    void testPendingListEmpty() {
        List<TelemedicineVisit> list = telemedicineService.pendingList();
        assertNotNull(list);
    }
}
