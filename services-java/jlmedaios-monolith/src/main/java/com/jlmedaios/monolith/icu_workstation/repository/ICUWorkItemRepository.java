/*
 * 健澜科技 jlmedaios - ICU 床位工作项 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.repository;

import com.jlmedaios.monolith.icu_workstation.entity.ICUWorkItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ICU 床位工作项 Repository。
 */
@Repository
public interface ICUWorkItemRepository extends JpaRepository<ICUWorkItem, Long> {

    /**
     * 按状态查询 ICU 床位工作项。
     *
     * @param status 状态
     * @return ICU 床位工作项列表
     */
    List<ICUWorkItem> findByStatus(String status);

    /**
     * 按工作项编号查询 ICU 床位工作项（P1 性能优化：替代 findAll().filter()）。
     *
     * @param workItemNo 工作项编号
     * @return ICU 床位工作项
     */
    ICUWorkItem findByWorkItemNo(String workItemNo);
}
