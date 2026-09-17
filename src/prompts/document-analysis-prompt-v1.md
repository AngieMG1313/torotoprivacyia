Analyze the attached document for Toroto Privacy IA.

Inputs available to you:
1. The authoritative Toroto privacy rules.
2. Validated training examples and lessons.
3. The document to analyze.

Tasks:
1. Review every page, including visual content.
2. Identify content relevant to TOR-PRIV-001 through TOR-PRIV-011.
3. Evaluate context before recommending redaction.
4. Return REDACT, KEEP, or HUMAN_REVIEW_REQUIRED for each relevant detection.
5. Return normalized page coordinates when they can be determined reliably.
6. If exact text cannot be read, return exact_text = null rather than guessing.
7. Detect repeated occurrences separately.
8. Never approve the document for publication.
9. Return only JSON matching `gemini-response-schema-v1.json`.

Pay special attention to:
- commercial counterparties;
- prices, amounts and costs;
- economic distributions and commissions;
- offers, negotiation limits and exclusivity;
- personal data;
- signatures, fingerprints and attendance lists;
- information contained in scans, handwriting and tables.

Remember: quorum percentages and economic percentages are not equivalent. Evaluate their semantic purpose before deciding.
