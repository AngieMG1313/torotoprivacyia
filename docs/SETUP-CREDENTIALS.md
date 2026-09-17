# Guía: obtener las credenciales de Toroto Privacy IA

Estas son las 4 credenciales que pide `.env.example`. Ninguna la puedo crear
yo por ti (son cuentas propias de Toroto/tuyas), pero aquí está exactamente
dónde conseguir cada una. Cuando las tengas, ponlas en:

- **Local**: copia `.env.example` a `.env` y rellena los valores.
- **Producción (Vercel)**: Project → Settings → Environment Variables, una
  por una, con el mismo nombre que en `.env.example`.

---

## 1. `DATABASE_URL` (Postgres)

Opción más simple si ya vas a desplegar en Vercel:

1. En tu proyecto de Vercel: **Storage → Create Database → Postgres**
   (Vercel Postgres, corre sobre Neon).
2. Al crearla, Vercel te ofrece **conectarla al proyecto automáticamente**
   — esto ya inyecta `DATABASE_URL` (y variantes) como env var del proyecto.
3. Para desarrollo local, copia el valor de `DATABASE_URL` desde
   Storage → tu base de datos → pestaña **.env.local** y pégalo en tu `.env`.

Alternativa sin Vercel: crear una base gratis en [neon.tech](https://neon.tech)
o [supabase.com](https://supabase.com) — ambos te dan una connection string
`postgres://usuario:password@host/db` que sirve igual.

Después de tenerla: `npm run db:migrate` crea las tablas.

---

## 2. `BLOB_READ_WRITE_TOKEN` (Vercel Blob)

1. En tu proyecto de Vercel: **Storage → Create Database → Blob**.
2. Al conectarlo al proyecto, Vercel agrega automáticamente
   `BLOB_READ_WRITE_TOKEN` a las env vars.
3. Para local: Storage → tu Blob store → **.env.local**, copia el token.

No hay alternativa fuera de Vercel — Blob es específico de la plataforma.

---

## 3. `GEMINI_API_KEY` (Google Gemini)

1. Ve a **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
   (Google AI Studio).
2. Inicia sesión con la cuenta de Google que quieras usar para facturación
   (puede ser una cuenta personal o del Workspace de Toroto — recomendable
   una cuenta de servicio/administrativa, no la de una persona).
3. **Create API key** → elige o crea un proyecto de Google Cloud →
   copia la key generada (empieza con `AIza...`).
4. Esa key va directo a `GEMINI_API_KEY`. **Nunca la pongas en el código ni
   en el cliente** — el proyecto ya está armado para que solo viva en el
   backend (ver `src/services/gemini.ts`).

`GEMINI_MODEL` puedes dejarlo en `gemini-2.5-pro` (ya es el valor por
defecto si no lo defines).

Nota de costos: Gemini cobra por token procesado, incluyendo las páginas
del PDF. Dado que los documentos de Toroto son escaneados (confirmado en
`docs/UAT-ROUND-1.md`), cada página cuesta más tokens que texto plano —
vale la pena revisar el pricing de `gemini-2.5-pro` en
[ai.google.dev/pricing](https://ai.google.dev/pricing) antes de la ronda de UAT.

---

## 4. Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`)

Esto restringe el login a cuentas `@toroto.mx` (o el dominio que pongas en
`ALLOWED_EMAIL_DOMAIN`).

1. Ve a **[console.cloud.google.com](https://console.cloud.google.com)** →
   crea o selecciona un proyecto (puede ser el mismo de Gemini).
2. **APIs & Services → OAuth consent screen**:
   - User type: **Internal** si Toroto usa Google Workspace (así solo
     entran cuentas `@toroto.mx` desde el consent screen mismo, doble capa
     de seguridad); si no usan Workspace, elige **External** y en ese caso
     la restricción de dominio la hace nuestro código
     (`src/services/auth.ts`, ya implementado).
   - Llena nombre de la app ("Toroto Privacy IA"), correo de soporte, etc.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: agrega
     `http://localhost:3000/api/auth/google/callback` (para desarrollo) y,
     cuando tengas el dominio de producción,
     `https://TU-DOMINIO/api/auth/google/callback`.
4. Al crearlo, Google te muestra **Client ID** y **Client secret** — van a
   `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
5. `GOOGLE_CALLBACK_URL` = la misma URL de redirect que pusiste en el paso 3
   (la que corresponda al ambiente: local o producción).
6. `ALLOWED_EMAIL_DOMAIN` = `toroto.mx` (ya es el valor por defecto).

---

## 5. `SESSION_SECRET`

No es de ningún proveedor externo — es solo una clave aleatoria para firmar
las cookies de sesión. Genera una con:

```bash
openssl rand -hex 32
```

y pégala tal cual en `SESSION_SECRET`.

---

## Orden recomendado

1. `SESSION_SECRET` (1 minuto, no depende de nada).
2. `DATABASE_URL` + `BLOB_READ_WRITE_TOKEN` (si vas a usar Vercel Storage,
   ambos salen del mismo flujo de conectar el proyecto).
3. `GEMINI_API_KEY` (necesario para poder analizar cualquier documento).
4. Google OAuth al final, porque necesitas saber ya el dominio/URL donde va
   a vivir la app (local o el dominio real de Vercel) para poner el
   redirect URI correcto.

Una vez que tengas las 4, corre `npm run db:migrate` y `npm run dev` (ver
sección "Local development" del `README.md`) para probar todo el flujo de
punta a punta.
