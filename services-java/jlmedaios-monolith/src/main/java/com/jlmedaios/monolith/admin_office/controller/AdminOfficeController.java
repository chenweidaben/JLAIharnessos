/*
 * 健澜科技 jlmedaios - 行政办公 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.controller;

import com.jlmedaios.monolith.admin_office.entity.Announcement;
import com.jlmedaios.monolith.admin_office.entity.Meeting;
import com.jlmedaios.monolith.admin_office.service.AdminOfficeService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 行政办公 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminOfficeController {

    private final AdminOfficeService adminOfficeService;

    /**
     * 发布公告。
     *
     * @param body {title, content, publisher, priority}
     * @return Result<Announcement>
     */
    @PostMapping("/announcement")
    public Result<Announcement> publishAnnouncement(@RequestBody Map<String, Object> body) {
        Announcement announcement = adminOfficeService.publishAnnouncement(
                String.valueOf(body.get("title")),
                String.valueOf(body.get("content")),
                String.valueOf(body.get("publisher")),
                String.valueOf(body.get("priority"))
        );
        return Result.ok(announcement);
    }

    /**
     * 创建会议。
     *
     * @param body {meetingNo, title, host, startTime, endTime, location, attendeesJSON}
     * @return Result<Meeting>
     */
    @PostMapping("/meeting")
    public Result<Meeting> createMeeting(@RequestBody Map<String, Object> body) {
        Meeting meeting = adminOfficeService.createMeeting(
                String.valueOf(body.get("meetingNo")),
                String.valueOf(body.get("title")),
                String.valueOf(body.get("host")),
                LocalDateTime.parse(String.valueOf(body.get("startTime"))),
                LocalDateTime.parse(String.valueOf(body.get("endTime"))),
                String.valueOf(body.get("location")),
                String.valueOf(body.get("attendeesJSON"))
        );
        return Result.ok(meeting);
    }

    /**
     * 设置会议纪要。
     *
     * @param no   会议编号
     * @param body {minutes}
     * @return Result<Meeting>
     */
    @PutMapping("/meeting/{no}/minutes")
    public Result<Meeting> setMinutes(@PathVariable String no, @RequestBody Map<String, Object> body) {
        return adminOfficeService.setMinutes(no, String.valueOf(body.get("minutes")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 公告列表。
     *
     * @return Result<List<Announcement>>
     */
    @GetMapping("/announcements")
    public Result<List<Announcement>> announcementList() {
        return Result.ok(adminOfficeService.announcementList());
    }
}
