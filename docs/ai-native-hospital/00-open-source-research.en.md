# Open-Source HIS / EMR & Cloud-Native Healthcare Platform Research (English)

> Jianlan Technology (Hangzhou) · jlmedaios — Industrial-Grade Intelligent-Agent Operating System for Smart Hospitals
> Phase 1 · Open-Source Research
> Date: 2026-09-25　Method: live retrieval and cross-checking of official sites, docs, and public comparisons
> Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd.

---

## 1. Objectives & Scope

To evolve jlmedaios from a "real outpatient closed loop" toward an "integrated platform for AI-native hospitals over the next 15 years," this report surveys representative open-source Hospital Information Systems (HIS), Electronic Medical/Health Records (EMR/EHR), and cloud-native FHIR / openEHR platforms. We distill reusable **domain models, architecture patterns, engineering practices, and assets**, and clarify **license compatibility**.

Three groups, nine representative projects:

| Group | Projects |
|---|---|
| Full HIS / EMR | Bahmni, OpenEMR, GNU Health |
| Modular EMR platform | OpenMRS 3 (O3) |
| Cloud-native standards platforms (FHIR / openEHR) | Medplum, HAPI FHIR, EHRbase (with Better/Ocean for context) |

---

## 2. Project-by-Project Analysis

### 2.1 Medplum — FHIR-Native "Headless EHR" (closest to our stack)

- **Positioning**: developer-focused open healthcare platform; a "headless EHR" for building custom EHRs, patient portals, and clinical apps.
- **Stack**: TypeScript/Node (same language end-to-end); React component library and fully typed SDK.
- **License**: **Apache License 2.0**, self-hostable, no vendor lock-in.
- **Capabilities**:
  - Full FHIR R4 store & API: all resources, search parameters, REST, **GraphQL**, hosted terminology, **time-aware (versioned) search**;
  - TS/JS SDK: auth, search, paging, batch bundles, subscriptions as single calls;
  - **Bots** (JS/TS workflow automation, cloud-function-like) and **Agent** (secure bridge to on-prem legacy systems, HTTPS↔WSS, E2E encryption);
  - Access policies; **HITRUST e1** certified (June 2026).
- **Borrow**: FHIR-native store with multi-protocol gateway; Bots/Agent layering; versioned search for traceability/audit.
- **Limits**: FHIR-resource-centric; China-specific DRG-DIP settlement, HIS billing/pharmacy, and EMR grading require localization.
- Sources: <https://www.medplum.com>, <https://www.medplum.com/open-source>, <https://www.medplum.com/products>, <https://www.medplum.com/solutions/agent>

### 2.2 OpenMRS 3 (O3) — Micro-Frontend EMR Framework

- **Positioning**: a leading open EMR; O3 is its new **modular, extensible frontend framework** for point-of-care workflows and complex records.
- **Stack**: micro-frontends (independent ESM npm packages loaded on demand via **Import Map + Webpack Module Federation**); OpenMRS backend (Java) + MariaDB; **FHIR2 module** and REST.
- **License**: **Mozilla Public License 2.0 (MPL 2.0)**.
- **Capabilities**: ESMs export lifecycles, assembled at runtime via Import Map; extension system; runs on existing databases; reference production topology: Nginx gateway (SSL) + SPA static container + OpenMRS backend + MariaDB + optional Certbot.
- **Borrow**: **micro-frontend + module federation** assembly for multi-team scale; plugin/extension model (matches our goal of letting hospital IT assemble agents/pages); standard container topology.
- **Limits**: proprietary OpenMRS data model (person/obs/encounter) needs heavy localization; MPL is file-level copyleft—copying source files requires care.
- Sources: <https://o3-docs.openmrs.org/en-US/docs/introduction>, <https://o3-docs.openmrs.org/en-US/docs/key-repositories>, <https://openmrs.org/download/>, <https://o3-docs.openmrs.org/en-US/docs/recipes/deploy-to-production>

### 2.3 Bahmni — "Composed" Full HIS + EMR (most direct integration reference)

- **Positioning**: easy, complete open HIS & EMR (since 2012, designed for low-resource settings; deployed from small clinics to large hospitals across countries).
- **Architecture (key)**: orchestrates/enhances existing open products rather than building from scratch:
  - **OpenMRS** — EMR & patient management;
  - **OpenERP/Odoo** — inventory, billing, financial accounting;
  - **OpenELIS** — laboratory (LIS);
  - **DICOM / PACS** — imaging.
- **Interoperability**: **FHIR** via OpenMRS; REST + FHIR APIs; India **ABDM** certified.
- **Borrow**: the **"standard core + best-of-breed open components" integration model** (highly aligned with jlmedaios as the "Android of medical AI"); clear EMR/ERP/LIS/PACS boundaries unified under one hospital flow; standard APIs as contracts.
- **Limits**: heterogeneous stacks (Java/Python), high ops complexity; China billing/insurance/pharmacy requires replacing/localizing the Odoo parts.
- Sources: <https://www.bahmni.org/>, <https://bahmni.github.io/>, Bahmni Wiki (FHIR/ABDM)

### 2.4 EHRbase — openEHR-Native Clinical Data Repository

- **Positioning**: open backend for clinical apps and EHRs; standards-compliant for mission-critical operations.
- **Stack**: Java, **PostgreSQL**; all services via the **official openEHR REST API** (incl. **AQL**, the Archetype Query Language).
- **License**: **Apache 2.0**; key contributors vitagroup, ADOC (Germany).
- **Scale**: population-grade deployments such as **Catalonia (~7.5M residents)**.
- **Borrow**: openEHR **dual model (Reference Model + Archetypes/Templates)** for high-fidelity, evolvable modeling (new clinical concepts without schema changes); AQL concept queries; PostgreSQL base; large-scale validation.
- **Limits**: clinical repository only (no registration/billing transactions); steep openEHR curve and archetype governance.
- Sources: <https://openehr.org/platform/>, openEHR CDR comparison (nirmitee.io), openEHR server comparison (SciSpace)

### 2.5 HAPI FHIR — Most Widely Deployed Open FHIR Server

- **Positioning**: the most widely deployed open FHIR server (maintained by Smile CDR); a runnable FHIR resource server and reference implementation.
- **Stack**: Java (JVM); pluggable backends **PostgreSQL / MySQL / Oracle / SQL Server, plus MongoDB**; strong validation, interceptor chains, `$export`.
- **License**: open source (verify per repository/file before adoption).
- **Borrow**: FHIR **validation pipeline, interceptor chains, persistence abstraction, terminology and bulk export** practices.
- **Limits**: JVM, heterogeneous to our TS core—use as a standalone standard service or architecture reference, not a hard merge.
- Sources: FHIR comparison (nirmitee.io), worldmetrics FHIR review, HL7 open implementations list

### 2.6 OpenEMR & GNU Health (practice/public-health context)

- **OpenEMR**: **GPL v2**, full practice management (billing, scheduling, ONC-certified, SMART on FHIR); strong copyleft—**do not vendor directly**; use for functional benchmarking or as a standalone system.
- **GNU Health**: **public health, social medicine, genetics**; ICU/surgery modules; read-only FHIR API; reference for public health/specialties.
- Sources: Self-hosted EMR comparison (pistack.xyz), Modern Open Source EMR (ottehr.com)

---

## 3. Comparison Matrix

| Project | Type | Stack | License | FHIR | openEHR | Practice Mgmt (billing/inventory) | Primary Value to jlmedaios |
|---|---|---|---|---|---|---|---|
| **Medplum** | FHIR platform | TS/Node+React | **Apache 2.0** | Native R4 | — | Weak | FHIR gateway, Bots/Agent, versioned search (same stack) |
| **OpenMRS O3** | EMR framework | Java + micro-frontends | **MPL 2.0** | FHIR2 module | Module | Community | Micro-frontends/federation, extensions |
| **Bahmni** | Full HIS+EMR | Composed (Java/Py) | Varies | Via OpenMRS | — | **Strong (Odoo)** | Composed, integrated-platform model |
| **EHRbase** | openEHR CDR | Java+PG | **Apache 2.0** | Bridge | **Native** | None | openEHR dual model, AQL, large scale |
| **HAPI FHIR** | FHIR server | Java | Open | Native | — | None | FHIR validation/interceptors/persistence |
| **OpenEMR** | Full EMR | PHP | **GPL v2** | SMART on FHIR | Limited | **Strong** | Functional benchmark (no vendoring) |
| **GNU Health** | Public-health EMR | Python | GPL | Read-only | — | Medium | Public health/genetics/ICU reference |

---

## 4. Key Insight: FHIR and openEHR Are Complementary

Multiple platforms and sources consistently show:

- **openEHR excels at high-fidelity clinical persistence**: community-governed archetypes/templates express clinical concepts; the dual model lets structures evolve without breaking data.
- **FHIR excels at API-based exchange and ecosystem integration**: web/mobile-friendly resources, mature SMART on FHIR, subscriptions, bulk data.
- **They are complementary**—a common pattern is **"openEHR for storage + FHIR for interoperability"** (e.g., Medblocks).

**Conclusion for jlmedaios**: adopt a **dual-track FHIR / openEHR mapping**—an evolvable clinical model internally for fidelity/traceability, FHIR APIs externally for regional platforms and third parties. Near term: PostgreSQL relational model + FHIR externally; openEHR as an optional high-fidelity clinical store via a mapping layer—not a big-bang rewrite.

Sources: Medblocks "EHR Systems Explained", Semantic Scholar "Comparison of OpenEHR and HL7 FHIR", pistack self-hosted comparison

---

## 5. License Compliance (hard boundary before adoption)

| License | Projects | Copyleft | Usage in jlmedaios |
|---|---|---|---|
| **Apache 2.0** | Medplum, EHRbase | Permissive (patent grant) | **Can reference/vendor**, keep LICENSE/NOTICE & headers |
| **MPL 2.0** | OpenMRS | File-level (modified MPL files stay open; no contagion to others) | Standalone service/learning; if copying MPL files, open them per-file; prefer architecture-level reuse |
| **GPL v2/v3** | OpenEMR, GNU Health | Strong (derived whole must be open) | **Do not vendor into the main repo**; deploy standalone or benchmark only |
| **CC BY-NC-SA 4.0** | DAMO-RADAR weights | Non-commercial, share-alike | Research/non-commercial only; commercial clinical use needs licensing & medical-device registration |

**Principle**: the jlmedaios main repo includes only permissive (Apache/MIT/BSD) and self-developed code; MPL/GPL components integrate as **standalone microservices/processes** via decoupled interfaces, with a full license inventory (SBOM) in docs and distributions.

---

## 6. Implications for jlmedaios (feeding the top-level design)

1. **Integrated, not point solutions** (Bahmni): on the jlmedaios agent core, compose/integrate HIS (registration/billing/pharmacy), EMR (documentation), LIS, PACS into one flow, decoupled via standard APIs/events.
2. **AI-native cross-cutting layer** (Medplum Bots/Agent): agent orchestration, Skills, CDS, RAG embedded in every workflow, with **physician review/signature for writes and diagnosis**.
3. **Assemblable frontends** (OpenMRS O3): low-code assembly of pages and agents (AI scribe, AI QC, voice EMR, etc.) by hospital IT.
4. **Dual standards track**: FHIR externally, evolvable clinical model (toward openEHR) internally for 15-year evolution and interoperability.
5. **Cloud-native & high concurrency**: gateway + stateless services + PostgreSQL + event streaming + observability, with circuit breaking/rate limiting/load leveling for tertiary-hospital scale.
6. **Built-in compliance**: MLPS 2.0 Level 3, hash-chained audit, 16 masking rules, RBAC+ABAC, multi-tenant multi-campus from day one.

> These findings feed the companion documents: the **Top-Level Design for an AI-Native Integrated Hospital Platform** and the **Strangler Refactoring Roadmap**.

---

## 7. Sources

- Medplum: <https://www.medplum.com>, <https://www.medplum.com/open-source>, <https://www.medplum.com/products>, <https://www.medplum.com/solutions/agent>, <https://www.medplum.com/blog/hitrust-e1-certification>
- OpenMRS O3: <https://o3-docs.openmrs.org/en-US/docs/introduction>, <https://o3-docs.openmrs.org/en-US/docs/key-repositories>, <https://openmrs.org/download/>, <https://o3-docs.openmrs.org/en-US/docs/recipes/deploy-to-production>
- Bahmni: <https://www.bahmni.org/>, <https://bahmni.github.io/>
- EHRbase / openEHR: <https://openehr.org/platform/>, <https://nirmitee.io/blog/openehr-cdr-vendor-comparison-2026/>, <https://scispace.com/pdf/comparison-of-openehr-open-source-servers-3gab0geblm.pdf>
- HAPI FHIR: <https://nirmitee.io/blog/fhir-data-store-compared-hapi-google-aws-healthlake-azure/>, <https://worldmetrics.org/best/fhir-software/>, <https://confluence.hl7.org/spaces/FHIR/pages/35718838/Open+Source+Implementations>
- Comparisons: <https://www.pistack.xyz/posts/2026-06-04-self-hosted-medical-emr-ehr-openemr-openmrs-ehrbase-guide/>, <https://www.ottehr.com/posts/modern-open-source-emr-options>, <https://medblocks.com/blog/ehr-systems-explained>

> Note: information from public web retrieval; versions and licenses are governed by each project's official repository at the time. Before importing any code, licenses will be verified per file and included in the SBOM.
