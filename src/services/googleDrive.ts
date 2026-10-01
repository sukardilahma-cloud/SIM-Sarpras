import { getAccessToken } from './googleAuth';

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

export async function uploadBackupToDrive(
  content: string,
  customName?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan masuk kembali dengan Akun Google Anda.');
  }

  const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const fileName = customName || `SARPRAS_BACKUP_SMKN1_KOTAMOBAGU_${dateStr}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Cadangan Resmi Basis Data SARPRAS SMK Negeri 1 Kotamobagu',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal mengunggah cadangan ke Google Drive: ${errorText}`);
  }

  return await res.json();
}

export async function listBackupsFromDrive(): Promise<DriveBackupFile[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif. Silakan masuk kembali dengan Akun Google Anda.');
  }

  const query = encodeURIComponent("name contains 'SARPRAS_BACKUP' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size,webViewLink)&orderBy=createdTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal memuat daftar cadangan dari Google Drive: ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : undefined,
    webViewLink: f.webViewLink,
  }));
}

export async function downloadBackupFromDrive(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal mengunduh file cadangan dari Google Drive: ${errorText}`);
  }

  return await res.text();
}

export async function deleteBackupFromDrive(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum aktif.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal menghapus file dari Google Drive: ${errorText}`);
  }
}
