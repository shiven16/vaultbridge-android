export function formatBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!n || isNaN(n) || n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  const val = n / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

