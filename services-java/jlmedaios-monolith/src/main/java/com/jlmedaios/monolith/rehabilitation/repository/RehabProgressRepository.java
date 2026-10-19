/*
 * 健澜科技 jlmedaios - 康复进度记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation.repository;

import com.jlmedaios.monolith.rehabilitation.entity.RehabProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 康复进度记录 Repository。
 */
@Repository
public interface RehabProgressRepository extends JpaRepository<RehabProgress, Long> {

    /**
     * 按处方编号查询康复进度。
     *
     * @param orderNo 处方编号
     * @return 康复进度列表
     */
    List<RehabProgress> findByOrderNo(String orderNo);
}
