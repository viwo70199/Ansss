# 🤖 Telegram Broadcast Bot

Bot Telegram canggih untuk menyebarkan pesan ke multiple grup dengan fitur keamanan dan automation.

## 🎯 Fitur Utama

### 1️⃣ **Sebar Pesan Otomatis**
- Tombol "Sebar Pesan" untuk kirim teks ke semua grup atau grup tertentu
- Tampilkan status sukses/gagal setiap pengiriman
- Delay acak (500ms - 2000ms) untuk mencegah spam detection Telegram

### 2️⃣ **Manajemen Grup**
- ➕ Tambah grup dengan ID atau link
- 📜 Lihat daftar semua grup yang terdaftar
- ❌ Hapus grup dari daftar

### 3️⃣ **Pengaturan Delay & Timer**
- ⚙️ Atur jeda minimum dan maksimum antar pengiriman
- ⏰ Jadwalkan pengiriman pesan pada waktu tertentu
- Aktifkan/nonaktifkan pengiriman otomatis

### 4️⃣ **Auto Join & Backup Session**
- Auto join ketika dikirim link grup (optional)
- 💾 Simpan sesi login dengan sekali klik
- Restore sesi dari backup

### 5️⃣ **Notifikasi & Log Aktivitas**
- Status real-time untuk setiap pengiriman
- Log lengkap disimpan di `data/activity.log`
- Console output untuk debugging

### 6️⃣ **Antarmuka Full Button (Inline Keyboard)**
\`\`\`
📣 Sebar Pesan | ➕ Tambah Grup
📜 List Grup   | ❌ Hapus Grup
⚙️ Atur Delay  | ⏰ Timer
💾 Backup Session | 📋 Lihat Log
\`\`\`

### 7️⃣ **Keamanan & Anti Spam**
- Delay acak antara setiap pengiriman
- Rate limiting: max 25 pesan per menit
- Validasi input untuk mencegah abuse
- Log audit lengkap

## 🚀 Instalasi

### 1. Clone atau download repository

\`\`\`bash
git clone https://github.com/yourusername/telegram-broadcast-bot.git
cd telegram-broadcast-bot
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Buat bot di Telegram

- Buka [@BotFather](https://t.me/botfather) di Telegram
- Kirim `/newbot`
- Ikuti instruksi untuk membuat bot baru
- Copy token yang diberikan

### 4. Setup environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` dan masukkan:
\`\`\`
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
OWNER_ID=YOUR_USER_ID_HERE
\`\`\`

Untuk mendapatkan OWNER_ID:
- Buka [@userinfobot](https://t.me/userinfobot)
- Bot akan menampilkan ID Anda

### 5. Jalankan bot

\`\`\`bash
npm start
\`\`\`

## 📖 Cara Penggunaan

### Perintah Utama

| Command | Deskripsi |
|---------|-----------|
| `/start` | Buka menu utama bot |
| `/help` | Tampilkan panduan lengkap |

### Menu Buttons

**📣 Sebar Pesan**
- Pilih untuk mengirim pesan ke grup
- Pilih "Ke Semua Grup" atau "Ke Grup Tertentu"
- Ketik pesan yang ingin dikirim

**➕ Tambah Grup**
- Kirim ID grup dalam format: `-1001234567890`
- Atau kirim link grup Telegram

**📜 List Grup**
- Lihat semua grup yang sudah ditambahkan
- Tampilkan ID, nama, dan waktu ditambahkan

**❌ Hapus Grup**
- Kirim ID grup yang ingin dihapus
- Konfirmasi penghapusan

**⚙️ Atur Delay**
- Ubah delay minimum (default: 500ms)
- Ubah delay maksimum (default: 2000ms)
- Toggle auto-join dan broadcast

**⏰ Timer**
- Jadwalkan pengiriman dalam 5, 10, 30 menit, atau 1 jam
- Atau masukkan custom waktu
- Bot akan mengirim pesan otomatis pada waktu yang ditentukan

**💾 Backup Session**
- Simpan backup sesi dan pengaturan
- File tersimpan di `data/session.json`

**📋 Lihat Log**
- Tampilkan 20 log aktivitas terakhir
- Gunakan untuk debugging dan monitoring

## 📁 Struktur File

\`\`\`
telegram-broadcast-bot/
├── bot.js              # File utama bot
├── package.json        # Dependencies
├── .env.example        # Template environment variables
├── .env                # Environment variables (jangan commit!)
├── README.md           # Dokumentasi ini
└── data/              # Folder penyimpanan data
    ├── groups.json    # Daftar grup
    ├── settings.json  # Pengaturan bot
    ├── session.json   # Backup sesi
    └── activity.log   # Log aktivitas
\`\`\`

## 🔒 Keamanan

✅ **Fitur Keamanan:**
- Delay random untuk anti-spam
- Rate limiting 25 pesan/menit
- Validasi input sebelum processing
- Log audit lengkap setiap aktivitas
- Session backup untuk recovery

⚠️ **Recommendations:**
- Jangan share `.env` file ke public
- Gunakan bot token yang baru jika terlalu lama
- Monitor log file secara berkala
- Set rate limit sesuai kebutuhan

## 🐛 Troubleshooting

### Bot tidak merespons
1. Pastikan token di `.env` sudah benar
2. Cek koneksi internet
3. Lihat error di console

### Pesan tidak terkirim
1. Verifikasi ID grup sudah benar
2. Pastikan bot adalah member grup
3. Cek batasan Telegram (rate limit)
4. Lihat log di `data/activity.log`

### Error polling
1. Restart bot dengan `npm start`
2. Pastikan hanya satu instance bot yang berjalan
3. Check konsol untuk error message

## 📊 Monitoring & Logs

Bot secara otomatis menyimpan semua aktivitas ke `data/activity.log`:

\`\`\`
[2024-01-15T10:30:45.123Z] BROADCAST_SUCCESS: Pesan dikirim ke Grup Bisnis
[2024-01-15T10:30:46.456Z] BROADCAST_SUCCESS: Pesan dikirim ke Grup Developer
[2024-01-15T10:30:47.789Z] BROADCAST_COMPLETE: Berhasil: 2, Gagal: 0
\`\`\`

Gunakan perintah `/logs` untuk melihat log terbaru di Telegram.

## 🎨 Customization

Edit di `bot.js` untuk customize:
- Emoji dan format pesan
- Delay range (variabel `delayMin`, `delayMax`)
- Rate limit (variabel `maxMessagesPerMinute`)
- Keyboard layout dan buttons

## 📝 License

MIT License - Feel free to use dan modify!

## 💬 Support

Jika ada pertanyaan atau bug report:
1. Cek documentation terlebih dahulu
2. Baca troubleshooting section
3. Check console logs untuk error details

## 🚨 Disclaimer

Bot ini adalah tool untuk automation dan productivity. Gunakan dengan bertanggung jawab:
- ✅ Kirim pesan ke grup yang Anda miliki
- ✅ Automation untuk bisnis dan community
- ❌ Jangan untuk spam atau hal-hal ilegal
- ❌ Hormati ToS Telegram

Telegram berhak memblokir akun atau bot yang melakukan spam!
