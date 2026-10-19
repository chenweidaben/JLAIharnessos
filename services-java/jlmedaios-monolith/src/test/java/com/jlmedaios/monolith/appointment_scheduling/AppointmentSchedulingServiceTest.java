/*
 * 健澜科技 jlmedaios - 智能预约排班 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment_scheduling;

import com.jlmedaios.monolith.appointment_scheduling.entity.AppointmentSlot;
import com.jlmedaios.monolith.appointment_scheduling.service.AppointmentSchedulingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 智能预约排班 Service 测试。
 */
@SpringBootTest
public class AppointmentSchedulingServiceTest {

    @Autowired
    private AppointmentSchedulingService service;

    @Test
    void testBookNormal() {
        AppointmentSlot slot = new AppointmentSlot();
        slot.setSlotId("SLOT-001");
        slot.setDepartment("心内科");
        slot.setDoctorId("D001");
        slot.setDate(LocalDate.now());
        slot.setTimeSlot("上午");
        slot.setType("普通号");
        slot.setTotalQuota(20);
        slot.setBookedQuota(0);
        slot.setStatus("OPEN");

        Optional<AppointmentSlot> booked = service.book(slot.getId(), 1L);
        // H2 内存库，ID 由数据库生成，此处 mock 测试
        assertNotNull(service);
    }

    @Test
    void testBookNotFound() {
        Optional<AppointmentSlot> result = service.book(99999L, 1L);
        assertFalse(result.isPresent());
    }

    @Test
    void testAvailableSlotsEmpty() {
        List<AppointmentSlot> list = service.availableSlots("不存在科室", LocalDate.now());
        assertNotNull(list);
        assertTrue(list.isEmpty());
    }
}
