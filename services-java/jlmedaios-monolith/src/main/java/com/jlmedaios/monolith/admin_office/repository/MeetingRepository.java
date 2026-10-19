/*
 * 健澜科技 jlmedaios - 会议 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.repository;

import com.jlmedaios.monolith.admin_office.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 会议 Repository。
 */
@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    /**
     * 按状态查询会议。
     *
     * @param status 状态
     * @return 会议列表
     */
    List<Meeting> findByStatus(String status);

    /**
     * 按会议编号查询会议。
     *
     * @param meetingNo 会议编号
     * @return 会议
     */
    Optional<Meeting> findByMeetingNo(String meetingNo);
}
