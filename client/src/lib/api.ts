async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Not authenticated')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  me: () => request<{ id: number; email: string; name: string | null }>('/auth/me'),

  createDocument: (filename: string, requesterArea?: string) =>
    request<{ documentId: string }>('/documents', {
      method: 'POST',
      body: JSON.stringify({ filename, requesterArea }),
    }),

  completeUpload: (id: string, body: { blobUrl: string; sha256: string; sizeBytes: number }) =>
    request<void>(`/documents/${id}/complete-upload`, { method: 'POST', body: JSON.stringify(body) }),

  listDocuments: () => request<import('../types').DocumentRecord[]>('/documents'),

  getDocument: (id: string) =>
    request<import('../types').DocumentRecord>(`/documents/${id}`),

  analyzeDocument: (id: string) =>
    request<{ jobId: string }>(`/documents/${id}/analyze`, { method: 'POST' }),

  getAnalysisStatus: (id: string) =>
    request<import('../types').AnalysisStatus>(`/documents/${id}/analysis-status`),

  listDetections: (documentId: string) =>
    request<import('../types').Detection[]>(`/documents/${documentId}/detections`),

  patchDetection: (
    id: string,
    body: {
      reviewStatus: import('../types').ReviewStatus
      manualLocation?: import('../types').DetectionLocation
    },
  ) => request<void>(`/detections/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  exportDocument: (id: string, confirmedAudit: boolean) =>
    request<{ publicUrl: string; inputSha256: string; outputSha256: string }>(
      `/documents/${id}/export`,
      { method: 'POST', body: JSON.stringify({ confirmedAudit }) },
    ),

  submitFeedback: (body: { documentId?: string; sentiment?: string; message: string }) =>
    request<void>('/feedback', { method: 'POST', body: JSON.stringify(body) }),
}
