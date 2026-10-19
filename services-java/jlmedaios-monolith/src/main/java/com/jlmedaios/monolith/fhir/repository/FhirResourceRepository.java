/*
 * 健澜科技 jlmedaios - FHIR 资源 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.fhir.repository;

import com.jlmedaios.monolith.fhir.entity.FhirResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FHIR 资源 Repository。
 */
@Repository
public interface FhirResourceRepository extends JpaRepository<FhirResource, Long> {

    /**
     * 按资源类型 + 患者 ID 查询资源列表。
     *
     * @param resourceType 资源类型
     * @param patientId    患者 ID
     * @return 资源列表
     */
    List<FhirResource> findByResourceTypeAndPatientId(String resourceType, Long patientId);

    /**
     * 按资源类型 + 资源 ID 查询资源。
     *
     * @param resourceType 资源类型
     * @param resourceId   资源 ID
     * @return 资源 Optional
     */
    Optional<FhirResource> findByResourceTypeAndResourceId(String resourceType, String resourceId);
}
