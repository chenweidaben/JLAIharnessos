/*
 * 健澜科技 jlmedaios - 检验申请 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.lis.repository;

import com.jlmedaios.his.lis.entity.LisRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 检验申请 Repository。
 * TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口后，增加按 testCode 查询的派生方法。
 */
@Repository
public interface LisRequestRepository extends JpaRepository<LisRequest, Long> {
}
