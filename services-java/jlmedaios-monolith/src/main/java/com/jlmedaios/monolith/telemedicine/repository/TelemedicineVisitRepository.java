/*
 * 健澜科技 jlmedaios - 远程问诊 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.telemedicine.repository;

import com.jlmedaios.monolith.telemedicine.entity.TelemedicineVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 远程问诊 Repository。
 */
@Repository
public interface TelemedicineVisitRepository extends JpaRepository<TelemedicineVisit, Long> {

    /**
     * 按状态查询远程问诊。
     *
     * @param status 状态
     * @return 远程问诊列表
     */
    List<TelemedicineVisit> findByStatus(String status);
}
