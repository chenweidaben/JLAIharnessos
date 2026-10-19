/*
 * 健澜科技 jlmedaios - 互联互通评级指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.interconnection_rating.repository;

import com.jlmedaios.monolith.interconnection_rating.entity.InterconnectionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 互联互通评级指标 Repository。
 */
@Repository
public interface InterconnectionItemRepository extends JpaRepository<InterconnectionItem, Long> {

    /**
     * 按类别查询互联互通评级指标。
     *
     * @param category 类别
     * @return 互联互通评级指标列表
     */
    List<InterconnectionItem> findByCategory(String category);

    /**
     * 按状态查询互联互通评级指标。
     *
     * @param status 状态
     * @return 互联互通评级指标列表
     */
    List<InterconnectionItem> findByStatus(String status);
}
