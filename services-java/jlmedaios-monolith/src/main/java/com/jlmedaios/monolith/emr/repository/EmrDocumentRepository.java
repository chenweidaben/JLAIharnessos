/*
 * 健澜科技 jlmedaios - 电子病历文档 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emr.repository;

import com.jlmedaios.monolith.emr.entity.EmrDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 电子病历文档 Repository。
 */
@Repository
public interface EmrDocumentRepository extends JpaRepository<EmrDocument, Long> {

    /**
     * 按患者 ID 查询病历列表。
     *
     * @param patientId 患者 ID
     * @return 病历列表
     */
    List<EmrDocument> findByPatientId(Long patientId);

    /**
     * 按病历类型查询病历列表。
     *
     * @param docType 病历类型
     * @return 病历列表
     */
    List<EmrDocument> findByDocType(String docType);
}
