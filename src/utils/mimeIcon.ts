// Maps MIME types to @expo/vector-icons Ionicons names
export function getMimeIcon(mimeType: string): string {
  if (!mimeType) return 'document-outline';
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive'))
    return 'archive-outline';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'grid-outline';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return 'easel-outline';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document-text-outline';
  if (mimeType.includes('google-apps.folder')) return 'folder-outline';
  if (mimeType.includes('text/')) return 'code-slash-outline';
  return 'document-outline';
}

