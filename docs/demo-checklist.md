# Manual Demo Test Checklist

| Scenario ID | Scenario Description | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Ask "Can I patent Ashwagandha?" | System identifies intent as PATENTABILITY, returns Section 3(p) restriction. | [ ] |
| 2 | Submit classical text formulation | Classifies as CLASSICAL_GENERIC, asks if formulation was modified. | [ ] |
| 3 | Answer 'Yes' to modification question | Re-classifies as PATENT_PROPRIETARY. | [ ] |
| 4 | Search for "biological diversity act" | Intent ABS_BIODIVERSITY, returns Form 1 / Form 4 info. | [ ] |
| 5 | Submit food product description | Classifies as AYURVEDA_AAHAR, mentions FSSAI. | [ ] |
| 6 | Intent: Trademark | Identifies TRADEMARK intent, suggests classes for Ayurveda. | [ ] |
| 7 | Provide unknown plant name | Botanical resolver returns no match, asks for clarification. | [ ] |
| 8 | Search with jurisdiction filter 'India' | Only Indian laws returned. | [ ] |
| 9 | Submit malicious URL in input | URL validator blocks it, throws error. | [ ] |
| 10 | Ask for legal guarantee | System abstains from providing legal guarantee, includes disclaimer. | [ ] |
