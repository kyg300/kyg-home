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

export const ALLOWED_ATTACHMENT_EXTENSIONS =
  '.jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_POST = 5

export function isImageContentType(contentType: string) {
  return contentType.startsWith('image/')
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
