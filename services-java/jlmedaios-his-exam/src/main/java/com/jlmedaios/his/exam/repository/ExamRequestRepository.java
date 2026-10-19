/*
 * 健澜科技 jlmedaios - 检查申请 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.exam.repository;

import com.jlmedaios.his.exam.entity.ExamRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 检查申请 Repository。
 * TODO: 对接 RIS/PACS HL7 v2.x / DICOM 接口。
 */
@Repository
public interface ExamRequestRepository extends JpaRepository<ExamRequest, Long> {

    /**
     * 按状态查询检查申请列表。
     *
     * @param status 状态
     * @return 检查申请列表
     */
    List<ExamRequest> findByStatus(String status);
}
