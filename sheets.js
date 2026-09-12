import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// ---------------------------------------------------------------------------
// PETA PROYEK -> NAMA TAB
// Isi persis sama seperti nama tab yang muncul di bagian bawah Google Sheets.
// Kalau nama tab beda sedikit ejaan/spasinya dari label di app, PAKAI NAMA TAB
// ASLI di sini (bukan label yang tampil di dropdown SPV).
// ---------------------------------------------------------------------------
export const PROJECT_TABS = {
  'Z HAUZ LIMO': 'Z HAUZ LIMO',
  'VERBUR TAHAP 1': 'VERBUR TAHAP 1',
  'THE HAUZ CILODONG': 'THE HAUZ CILODONG',
  'VERLIM 3 EXTENTION': 'VERLIM 3 EXTENTION',
  'LE HAUZ LIMO': 'LE HAUZ LIMO',
  'VERBUR EXT': 'VERBUR EXT',
  'VERUA': 'VERUA',
  'THE HAUZ PANCORANMAS': 'THE HAUZ PANCORANMAS',
  'THE HAUZ PREMIER': 'THE HAUZ PREMIER',
  'Z HAUZ LIMO EXT': 'Z HAUZ LIMO EXT',
};

// Urutan kolom PERSIS seperti di sheet (kolom A sampai X).
// Jangan ubah urutan ini kecuali kolom di sheet aslinya juga diubah.
const COLUMNS = [
  'Blok', 'Kategori', 'ListDevice', 'Biaya', 'Status', 'TanggalPengajuan',
  'PurchaseOrder', 'TanggalPesanan', 'BuktiInvoice', 'SPV', 'ChecklistDiterima',
  'TibaPada', 'BuktiDokTiba', 'ChecklistPasang', 'TglSelesaiPasang',
  'BuktiDokPasang', 'StatusDevice', 'ListBarangRusak', 'BuktiBarangKendala',
  'ChecklistDiperbaiki', 'MasaGaransi', 'PemasanganWifi', 'PemasanganExtender', 'Catatan',
];

function colLetter(indexZeroBased) {
  let n = indexZeroBased + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

let cachedClient = null;

async function getSheetsClient() {
  if (cachedClient) return cachedClient;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Env var menyimpan \n literal, harus dikembalikan jadi newline asli
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  cachedClient = google.sheets({ version: 'v4', auth: client });
  return cachedClient;
}

function tabNameFor(proyek) {
  const tab = PROJECT_TABS[proyek];
  if (!tab) {
    throw new Error(
      `Proyek "${proyek}" belum ada di PROJECT_TABS (lib/sheets.js). Tambahkan dulu nama tab-nya.`
    );
  }
  return tab;
}

// Cari baris header ("BLOK" di kolom A) di dalam sebuah tab.
// Dicari otomatis supaya tidak perlu hardcode nomor baris.
async function findHeaderRow(sheets, tabName) {
  const range = `'${tabName}'!A1:A60`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const values = res.data.values || [];
  for (let i = 0; i < values.length; i++) {
    const cell = (values[i][0] || '').trim().toUpperCase();
    if (cell === 'BLOK') return i + 1; // 1-based row number
  }
  throw new Error(`Baris header "BLOK" tidak ditemukan di tab "${tabName}" (dicek baris 1-60).`);
}

/**
 * Cari baris untuk sebuah Blok di dalam tab proyek.
 * - Kalau Blok sudah ada di daftar -> kembalikan nomor barisnya (isNew: false)
 * - Kalau belum ada -> kembalikan baris kosong berikutnya di bawah data terakhir (isNew: true)
 */
export async function findRowForBlok(proyek, blok) {
  const sheets = await getSheetsClient();
  const tabName = tabNameFor(proyek);
  const headerRow = await findHeaderRow(sheets, tabName);

  const range = `'${tabName}'!A${headerRow + 1}:A${headerRow + 1000}`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const values = res.data.values || [];

  const target = blok.trim().toLowerCase();
  let lastNonEmptyOffset = -1;
  for (let i = 0; i < values.length; i++) {
    const cell = (values[i][0] || '').trim();
    if (cell !== '') lastNonEmptyOffset = i;
    if (cell.toLowerCase() === target) {
      return { tabName, rowNumber: headerRow + 1 + i, isNew: false };
    }
  }
  // Tidak ketemu -> baris baru tepat di bawah baris terisi terakhir
  const newRowNumber = headerRow + 1 + lastNonEmptyOffset + 1;
  return { tabName, rowNumber: newRowNumber, isNew: true };
}

// Gabungkan qty ke nama item, format: "Nama Item x6; Nama Item x2"
export function formatListDevice(items) {
  return items.map((it) => `${it.name} x${it.qty}`).join('; ');
}

/**
 * Tulis/isi data order ke baris yang sesuai (existing atau baris baru).
 * orderData: object dengan key sesuai nama-nama di COLUMNS (yang tidak diisi akan dikosongkan).
 */
export async function writeOrderToSheet(proyek, blok, orderData) {
  const sheets = await getSheetsClient();
  const { tabName, rowNumber, isNew } = await findRowForBlok(proyek, blok);

  const rowValues = COLUMNS.map((key) => orderData[key] ?? '');
  const range = `'${tabName}'!A${rowNumber}:${colLetter(COLUMNS.length - 1)}${rowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowValues] },
  });

  return { tabName, rowNumber, isNew };
}
