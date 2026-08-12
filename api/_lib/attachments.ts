export const ALLOWED_ATTACHMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_POST = 5

export interface AttachmentInput {
  url: string
  filename: string
  contentType: string
  size: number
}

export function isValidAttachmentInput(value: unknown): value is AttachmentInput {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.url === 'string' &&
    v.url.startsWith('https://') &&
    typeof v.filename === 'string' &&
    v.filename.trim().length > 0 &&
    typeof v.contentType === 'string' &&
    ALLOWED_ATTACHMENT_CONTENT_TYPES.includes(v.contentType) &&
    typeof v.size === 'number' &&
    v.size > 0 &&
    v.size <= MAX_ATTACHMENT_SIZE_BYTES
  )
}
