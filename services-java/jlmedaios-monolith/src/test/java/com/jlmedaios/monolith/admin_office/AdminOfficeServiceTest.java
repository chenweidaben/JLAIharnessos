/*
 * 健澜科技 jlmedaios - 行政办公 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office;

import com.jlmedaios.monolith.admin_office.entity.Announcement;
import com.jlmedaios.monolith.admin_office.service.AdminOfficeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 行政办公 Service 测试。
 */
@SpringBootTest
public class AdminOfficeServiceTest {

    @Autowired
    private AdminOfficeService service;

    @Test
    void testPublishAnnouncementNormal() {
        Announcement announcement = service.publishAnnouncement("通知标题",
                "通知内容", "张三", "普通");
        assertNotNull(announcement.getId());
        assertEquals("PUBLISHED", announcement.getStatus());
    }

    @Test
    void testSetMinutesNotFound() {
        assertTrue(service.setMinutes("不存在会议", "会议纪要").isEmpty());
    }

    @Test
    void testAnnouncementListNotNull() {
        assertNotNull(service.announcementList());
    }
}
