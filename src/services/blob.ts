import { del, head, put } from '@vercel/blob'

// Private PDFs (originals) and generated public/redacted PDFs both live in
// Vercel Blob. We never make the "original" prefix publicly listable, and
// URLs are only ever handed to authenticated users via our own API - the
// blob store itself has no notion of our app's auth, so treat every
// `blob_url_*` as a capability URL that must not be echoed back to clients
// who haven't been authorized for that document.

const ORIGINALS_PREFIX = 'originals'
const PUBLIC_PREFIX = 'public'

export async function storeOriginal(
  documentId: string,
  filename: string,
  data: Buffer,
): Promise<{ url: string }> {
  const blob = await put(`${ORIGINALS_PREFIX}/${documentId}/${filename}`, data, {
    access: 'public', // Vercel Blob has no private tier yet; access control is
    // enforced at our API layer (auth + per-document authorization), and the
    // pathname includes an unguessable document UUID.
    contentType: 'application/pdf',
    addRandomSuffix: false,
  })
  return { url: blob.url }
}

export async function storePublicPdf(
  documentId: string,
  data: Buffer,
): Promise<{ url: string }> {
  const blob = await put(`${PUBLIC_PREFIX}/${documentId}/public.pdf`, data, {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: false,
  })
  return { url: blob.url }
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url)
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url)
    return true
  } catch {
    return false
  }
}
