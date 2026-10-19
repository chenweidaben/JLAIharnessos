/*
 * 健澜科技 jlmedaios - 医生工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.doctor_workstation;

import com.jlmedaios.monolith.doctor_workstation.entity.DoctorSession;
import com.jlmedaios.monolith.doctor_workstation.service.DoctorWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医生工作站 Service 测试。
 */
@SpringBootTest
public class DoctorWorkstationServiceTest {

    @Autowired
    private DoctorWorkstationService doctorWorkstationService;

    @Test
    void testTodayPatients() {
        List<DoctorSession> list = doctorWorkstationService.todayPatients("D001");
        assertNotNull(list);
    }

    @Test
    void testStartVisit() {
        DoctorSession session = doctorWorkstationService.startVisit("D001", "P001", "心内科");
        assertNotNull(session.getId());
        assertEquals("IN_VISIT", session.getStatus());
    }

    @Test
    void testEndVisit() {
        DoctorSession session = doctorWorkstationService.startVisit("D002", "P002", "呼吸科");
        DoctorSession ended = doctorWorkstationService.endVisit(session.getId());
        assertNotNull(ended);
        assertEquals("COMPLETED", ended.getStatus());
    }

    @Test
    void testVisitDetail() {
        Map<String, Object> detail = doctorWorkstationService.visitDetail(1L);
        assertNotNull(detail);
        assertTrue(detail.containsKey("medicalRecord"));
    }
}
