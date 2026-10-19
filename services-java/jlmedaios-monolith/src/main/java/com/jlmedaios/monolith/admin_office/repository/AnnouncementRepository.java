/*
 * 健澜科技 jlmedaios - 公告 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_office.repository;

import com.jlmedaios.monolith.admin_office.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 公告 Repository。
 */
@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    /**
     * 按状态查询公告。
     *
     * @param status 状态
     * @return 公告列表
     */
    List<Announcement> findByStatus(String status);
}
