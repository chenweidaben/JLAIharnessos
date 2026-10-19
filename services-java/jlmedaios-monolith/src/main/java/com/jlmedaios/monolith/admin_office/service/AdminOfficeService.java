/*
 * 健澜科技 jlmedaios - 行政办公 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.service;

import com.jlmedaios.monolith.admin_office.entity.Announcement;
import com.jlmedaios.monolith.admin_office.entity.Meeting;
import com.jlmedaios.monolith.admin_office.repository.AnnouncementRepository;
import com.jlmedaios.monolith.admin_office.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 行政办公 Service。
 *
 * <p>append-only: 会议记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class AdminOfficeService {

    private final AnnouncementRepository announcementRepository;
    private final MeetingRepository meetingRepository;

    /**
     * 发布公告。
     *
     * @param title     标题
     * @param content   内容
     * @param publisher 发布人
     * @param priority  优先级
     * @return 已持久化的公告
     */
    public Announcement publishAnnouncement(String title, String content, String publisher,
                                             String priority) {
        Announcement announcement = Announcement.builder()
                .title(title)
                .content(content)
                .publisher(publisher)
                .priority(priority)
                .build();
        return announcementRepository.save(announcement);
    }

    /**
     * 创建会议。
     *
     * @param meetingNo     会议编号
     * @param title         标题
     * @param host           主持人
     * @param startTime      开始时间
     * @param endTime        结束时间
     * @param location       地点
     * @param attendeesJSON  参会人 JSON
     * @return 已持久化的会议
     */
    public Meeting createMeeting(String meetingNo, String title, String host,
                                  LocalDateTime startTime, LocalDateTime endTime,
                                  String location, String attendeesJSON) {
        Meeting meeting = Meeting.builder()
                .meetingNo(meetingNo)
                .title(title)
                .host(host)
                .startTime(startTime)
                .endTime(endTime)
                .location(location)
                .attendeesJSON(attendeesJSON)
                .build();
        return meetingRepository.save(meeting);
    }

    /**
     * 设置会议纪要。
     *
     * @param meetingNo 会议编号
     * @param minutes   会议纪要
     * @return 已更新的会议
     */
    public Optional<Meeting> setMinutes(String meetingNo, String minutes) {
        Optional<Meeting> opt = meetingRepository.findByMeetingNo(meetingNo);
        if (opt.isPresent()) {
            Meeting meeting = opt.get();
            meeting.setMinutes(minutes);
            meeting.setStatus("HELD");
            meetingRepository.save(meeting);
        }
        return opt;
    }

    /**
     * 公告列表。
     *
     * @return 公告列表
     */
    public List<Announcement> announcementList() {
        return announcementRepository.findByStatus("PUBLISHED");
    }
}
