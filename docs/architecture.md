# Architecture Document

## Overview
AyushIP Navigator is an AI decision-support system for Ayurveda and AYUSH IP and regulatory guidance. It assists users in determining intellectual property pathways (like Patents, Trademarks) and regulatory requirements (like Biodiversity Act) for Ayurvedic products and concepts.

## Module Dependency Diagram
```text
[Client App] --> [API Router]
[API Router] --> [Intent Classifier]
[API Router] --> [Adaptive Question Engine]
[API Router] --> [RAG Engine]
[Adaptive Question Engine] --> [Classification Module]
[RAG Engine] --> [Botanical Resolver]
[RAG Engine] --> [URL Validator]
[RAG Engine] --> [Corpus / Botanical Database]
```

## Data Flow
1. **Product Intake:** User submits a description of their Ayurvedic formulation or product.
2. **Classification & Intent:** The system classifies the user's intent (e.g., patentability check, trademark info).
3. **Adaptive Questions:** System iteratively asks questions to resolve missing details (e.g., Is it from a classical text?).
4. **Assessment:** Final classification (e.g., CLASSICAL_GENERIC, PATENT_PROPRIETARY).
5. **IP Routes:** Suggesting potential IP routes based on classification.
6. **RAG:** Searching the authoritative corpus for evidence and legal references (e.g., Patents Act Section 3(p)).
7. **Evidence Validation:** Validating sources and links.
8. **Report:** Generating a final summary report for the user.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database / Corpus:** Local JSON / In-memory (Prototype)
- **AI/RAG:** Vector embeddings, Retrieval-Augmented Generation (mocked or via API)

## Security Model
- **URL Validation:** Strict validation blocking localhost, private IPs, and credential URLs.
- **Evidence Integrity:** No fabricated laws; all conclusions map to a verified evidence ID from the corpus.
- **Data Isolation:** Jurisdiction filters prevent cross-contamination of laws (India vs. International).
