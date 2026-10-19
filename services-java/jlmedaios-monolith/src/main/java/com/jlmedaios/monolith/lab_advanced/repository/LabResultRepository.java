/*
 * 健澜科技 jlmedaios - 检验结果 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_advanced.repository;

import com.jlmedaios.monolith.lab_advanced.entity.LabResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 检验结果 Repository。
 */
@Repository
public interface LabResultRepository extends JpaRepository<LabResult, Long> {

    /**
     * 按申请单编号查询结果。
     *
     * @param orderNo 申请单编号
     * @return 结果列表
     */
    List<LabResult> findByOrderNo(String orderNo);

    /**
     * 按异常标志查询结果。
     *
     * @param abnormalFlag 异常标志
     * @return 结果列表
     */
    List<LabResult> findByAbnormalFlag(String abnormalFlag);
}
