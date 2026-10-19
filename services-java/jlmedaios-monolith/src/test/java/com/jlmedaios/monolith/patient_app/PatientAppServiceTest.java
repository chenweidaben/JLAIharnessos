/*
 * 健澜科技 jlmedaios - 患者 APP Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_app;

import com.jlmedaios.monolith.patient_app.service.PatientAppService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 患者 APP Service 测试。
 */
@SpringBootTest
public class PatientAppServiceTest {

    @Autowired
    private PatientAppService patientAppService;

    @Test
    void testMenu() {
        List<Map<String, Object>> menu = patientAppService.menu();
        assertNotNull(menu);
        assertTrue(menu.size() >= 5);
    }

    @Test
    void testNotifications() {
        List<Map<String, Object>> notifications = patientAppService.notifications("P001");
        assertNotNull(notifications);
    }

    @Test
    void testPreference() {
        Map<String, Object> result = patientAppService.preference("P001", "{\"notifications\":true}");
        assertNotNull(result);
        assertEquals("saved", result.get("status"));
    }
}
