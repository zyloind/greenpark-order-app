import { writeOrderToSheet, formatListDevice } from '../../../lib/sheets';

function combineBlokUnit(blok, unit) {
  const cleanBlok = (blok || '').trim().toUpperCase();
  const cleanUnit = (unit || '').trim();
  return `${cleanBlok}${cleanUnit}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proyek, blok, unit, tipe, items, spv, catatan } = req.body;

    if (!proyek || !blok || !tipe || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Data order tidak lengkap (proyek/blok/tipe/items wajib diisi).' });
    }

    const combinedBlok = combineBlokUnit(blok, unit);

    const orderData = {
      Blok: combinedBlok,
      Kategori: tipe === 'sh' ? 'SMARTHOME' : 'HOME WITH AI',
      ListDevice: formatListDevice(items),
      Status: 'PENGAJUAN',
      TanggalPengajuan: new Date().toLocaleDateString('id-ID'),
      SPV: spv || '',
      Catatan: catatan || '',
    };

    const result = await writeOrderToSheet(proyek, combinedBlok, orderData);

    return res.status(200).json({
      success: true,
      tab: result.tabName,
      row: result.rowNumber,
      blokTertulis: combinedBlok,
      message: result.isNew
        ? `Baris baru ditambahkan di tab "${result.tabName}" baris ${result.rowNumber}.`
        : `Baris unit "${combinedBlok}" di tab "${result.tabName}" berhasil diisi.`,
    });
  } catch (err) {
    console.error('Gagal menulis ke Google Sheets:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan saat menulis ke spreadsheet.' });
  }
}
