/*
 * 健澜科技 jlmedaios - 药品相互作用规则 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction.repository;

import com.jlmedaios.monolith.drug_interaction.entity.DrugInteractionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 药品相互作用规则 Repository。
 */
@Repository
public interface DrugInteractionRuleRepository extends JpaRepository<DrugInteractionRule, Long> {

    /**
     * 按两种药品编码查询规则。
     *
     * @param drugCodeA 药品 A 编码
     * @param drugCodeB 药品 B 编码
     * @return 规则列表
     */
    List<DrugInteractionRule> findByDrugCodeAAndDrugCodeB(String drugCodeA, String drugCodeB);

    /**
     * 按严重程度查询规则。
     *
     * @param severity 严重程度
     * @return 规则列表
     */
    List<DrugInteractionRule> findBySeverity(String severity);
}
