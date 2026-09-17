# UAT — Ronda 1

## Hallazgo previo (importante)

Los 10 documentos candidatos en `docs/fixtures/uat_candidates/` son **100%
escaneados**: 0 caracteres de texto extraíble en cada uno (verificado con
PyMuPDF), igual que `docs/fixtures/TRAIN-001/original.pdf`. Esto confirma
dos cosas para el diseño ya implementado:

1. Gemini tiene que apoyarse enteramente en su comprensión visual/OCR del
   PDF (no hay capa de texto que "hacer trampa" leyendo) — el
   `system-prompt-v1.md` ya lo anticipa ("no asumir que algo es seguro solo
   por estar en una imagen").
2. La ruta de redacción que realmente protege estos documentos es el
   blanqueo de píxeles de imagen (`PDF_REDACT_IMAGE_PIXELS` en
   `api/redact.py`), no la eliminación de texto — ya está implementada y
   verificada contra TRAIN-001.

Riesgo a vigilar en esta ronda: como no hay texto nativo, la confianza en
`exact_text` depende de qué tan bien Gemini "lee" el escaneo. Es esperable
más `exact_text: null` y más `HUMAN_REVIEW_REQUIRED` que en un PDF nativo.

## Documentos seleccionados para la Ronda 1

| # | Documento | Páginas | Por qué |
|---|-----------|---------|---------|
| 1 | `UAT-001_5.2 Acta aprobacion proyecto (1).pdf` | 7 | Acta de asamblea, el mismo tipo que TRAIN-001 (venta de créditos) — mejor punto de comparación directo con el único ejemplo validado. |
| 2 | `UAT-003_ACTA_ SALVAGUARDAS SOCIALES.pdf` | 8 | Tema distinto (salvaguardas sociales) — probable que dispare TOR-PRIV-011 (conflictos y datos delicados), categoría que TRAIN-001 no llegó a confirmar. |
| 3 | `UAT-005_Acuerdo de entendimiento y plan de trabajo...NCPE Centauro del Norte.pdf` | 17 | El más largo y pesado (13 MB) — es un convenio bilateral, no un acta; buena prueba de estrés para el pipeline (Gemini Files API, tiempos) y para TOR-PRIV-004/005 (contrapartes, negociación). |
| 4 | `UAT-007_MINUTA_ AVANCE_ VENTA_ CRTS.pdf` | 3 | Minuta financiera corta, formato distinto al acta; probable TOR-PRIV-001 (precios y montos) similar a TRAIN-001 pero en otro layout. |
| 5 | `UAT-009_MINUTA_ REPORTE_PR5.pdf` | 2 | El más corto — caso rápido para que el equipo tome confianza con la herramienta antes de los documentos más largos. |

Los 5 restantes (`UAT-002`, `UAT-004`, `UAT-006`, `UAT-008`, `UAT-010`)
quedan para una Ronda 2 una vez que el equipo tenga criterio calibrado con
estos cinco.

## Proceso por documento (según el flujo ya wireado en la app)

1. Cargar el PDF en la app (`Nueva censura` → sube el archivo).
2. Dejar que Gemini analice y revisar cada detección en la pantalla de
   Revisión Humana: aprobar, rechazar (falso positivo) o pseudonimizar.
3. Para detecciones sin ubicación confiable (`location.x/y = null`), usar
   "Marcar área manual" antes de poder aprobarlas — la app ya lo obliga.
4. Antes de exportar, un miembro del equipo hace su propia censura manual
   de referencia (o valida a ojo la de la app) y la guarda como
   `expected.pdf` junto al original, para poder comparar en el futuro.
5. Registrar hallazgos con el botón de Feedback UAT dentro de la app
   (`Hubo falsos positivos` / `Muy precisa` / reporte libre) — queda
   guardado en la tabla `feedback`, ligado al documento.

## Tabla de resultados (llenar durante la ronda)

| Documento | Fecha | Detecciones totales | Aprobadas | Falsos positivos | Requirió área manual | `expected.pdf` guardado | Notas |
|---|---|---|---|---|---|---|---|
| UAT-001 | | | | | | | |
| UAT-003 | | | | | | | |
| UAT-005 | | | | | | | |
| UAT-007 | | | | | | | |
| UAT-009 | | | | | | | |

## Qué hacer con los resultados

- Categorías con muchos falsos positivos o detecciones omitidas →
  candidatas a ajustar `src/prompts/system-prompt-v1.md` o
  `src/knowledge/privacy-rules.json` (nunca inventar reglas nuevas fuera de
  la guía oficial — reportarlo primero).
- Una vez que 3+ documentos tengan `expected.pdf` validado, se puede armar
  un script de precisión/recall automático comparando las detecciones de
  Gemini contra las regiones censuradas en `expected.pdf` (pendiente,
  Ronda 2).
