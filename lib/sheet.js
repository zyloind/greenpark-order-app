import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

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
  'LE HAUZ SIGNATURE': 'LE HAUZ SIGNATURE',
  'VERLIM 1': 'VERLIM 1',
  'Z HAUZ LIMO JUANDA': 'Z HAUZ LIMO JUANDA',
  'LE HAUZ CIBUBUR': 'LE HAUZ CIBUBUR',
};

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

async function findHeaderRow(sheets, tabName) {
  const range = `'${tabName}'!A1:A60`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const values = res.data.values || [];
  for (let i = 0; i < values.length; i++) {
    const cell = (values[i][0] || '').trim().toUpperCase();
    if (cell === 'BLOK') return i + 1;
  }
  throw new Error(`Baris header "BLOK" tidak ditemukan di tab "${tabName}" (dicek baris 1-60).`);
}

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
  const newRowNumber = headerRow + 1 + lastNonEmptyOffset + 1;
  return { tabName, rowNumber: newRowNumber, isNew: true };
}

export function formatListDevice(items) {
  return items.map((it) => `${it.name} x${it.qty}`).join('; ');
}

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
