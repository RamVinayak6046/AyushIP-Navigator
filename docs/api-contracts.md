# API Contracts

## 1. Intent Classification
**Method:** POST
**Path:** `/api/v1/intent`
**Description:** Classifies the user's intent.
**Request Body Schema:**
```json
{
  "query": "string"
}
```
**Response Schema:**
```json
{
  "intent": "string",
  "confidence": "number",
  "secondaryIntents": ["string"]
}
```
**Error Codes:** 400 Bad Request, 500 Internal Server Error

## 2. Product Classification
**Method:** POST
**Path:** `/api/v1/classify`
**Description:** Classifies the Ayurveda product.
**Request Body Schema:**
```json
{
  "details": "object"
}
```
**Response Schema:**
```json
{
  "classification": "string",
  "confidence": "number"
}
```

## 3. RAG Search
**Method:** POST
**Path:** `/api/v1/search`
**Description:** Searches the authoritative corpus.
**Request Body Schema:**
```json
{
  "query": "string",
  "filters": {
    "jurisdiction": "string"
  }
}
```
**Response Schema:**
```json
{
  "results": ["object"],
  "abstain": "boolean"
}
```

*(Note: Additional ~27 endpoints for adaptive questions, botanical resolution, URL validation, user feedback, and report generation follow similar structures.)*
