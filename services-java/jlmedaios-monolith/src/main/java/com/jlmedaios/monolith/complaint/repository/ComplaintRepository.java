/*
 * 健澜科技 jlmedaios - 投诉 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.complaint.repository;

import com.jlmedaios.monolith.complaint.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 投诉 Repository。
 */
@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    /**
     * 按状态查询投诉。
     *
     * @param status 状态
     * @return 投诉列表
     */
    List<Complaint> findByStatus(String status);

    /**
     * 按科室查询投诉。
     *
     * @param deptCode 科室编码
     * @return 投诉列表
     */
    List<Complaint> findByDeptCode(String deptCode);
}
