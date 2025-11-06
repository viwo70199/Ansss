require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const fs = require("fs")
const path = require("path")

// Konfigurasi
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN_HERE"
const OWNER_ID = process.env.OWNER_ID || "YOUR_USER_ID_HERE"
const bot = new TelegramBot(BOT_TOKEN, { polling: true })

// Inisialisasi file penyimpanan data
const DATA_DIR = "./data"
const GROUPS_FILE = path.join(DATA_DIR, "groups.json")
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json")
const LOG_FILE = path.join(DATA_DIR, "activity.log")
const SESSION_FILE = path.join(DATA_DIR, "session.json")

// Jaminkan direktori data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ==================== DATA MANAGER ====================
class DataManager {
  static getGroups() {
    if (!fs.existsSync(GROUPS_FILE)) {
      return []
    }
    try {
      return JSON.parse(fs.readFileSync(GROUPS_FILE, "utf8"))
    } catch (e) {
      return []
    }
  }

  static saveGroups(groups) {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2))
  }

  static addGroup(groupId, groupName) {
    const groups = this.getGroups()
    if (!groups.find((g) => g.id === groupId)) {
      groups.push({
        id: groupId,
        name: groupName,
        addedAt: new Date().toISOString(),
      })
      this.saveGroups(groups)
      this.log("GROUP_ADDED", `Grup ditambahkan: ${groupName} (${groupId})`)
      return true
    }
    return false
  }

  static removeGroup(groupId) {
    const groups = this.getGroups()
    const filtered = groups.filter((g) => g.id !== groupId)
    if (filtered.length < groups.length) {
      this.saveGroups(filtered)
      this.log("GROUP_REMOVED", `Grup dihapus: ${groupId}`)
      return true
    }
    return false
  }

  static getSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) {
      const defaultSettings = {
        broadcastEnabled: true,
        delayMin: 500,
        delayMax: 2000,
        maxMessagesPerMinute: 25,
        autoJoinEnabled: true,
      }
      this.saveSettings(defaultSettings)
      return defaultSettings
    }
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"))
    } catch (e) {
      return {}
    }
  }

  static saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  }

  static log(type, message) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${type}: ${message}\n`
    fs.appendFileSync(LOG_FILE, logMessage)
    console.log(`[${type}] ${message}`)
  }

  static saveSession(sessionData) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2))
    this.log("SESSION_BACKUP", "Sesi backup tersimpan")
  }

  static getSession() {
    if (!fs.existsSync(SESSION_FILE)) {
      return null
    }
    try {
      return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"))
    } catch (e) {
      return null
    }
  }
}

// ==================== BROADCAST MANAGER ====================
class BroadcastManager {
  static async broadcastMessage(message, groupIds = null) {
    const settings = DataManager.getSettings()
    const groups = DataManager.getGroups()
    const targetGroups = groupIds ? groups.filter((g) => groupIds.includes(g.id)) : groups

    if (targetGroups.length === 0) {
      return { success: 0, failed: 0, results: [] }
    }

    let success = 0
    let failed = 0
    const results = []
    let messageCount = 0
    const startTime = Date.now()

    for (const group of targetGroups) {
      // Cek rate limiting
      if (messageCount >= settings.maxMessagesPerMinute) {
        const elapsed = Date.now() - startTime
        if (elapsed < 60000) {
          await this.sleep(60000 - elapsed)
        }
        messageCount = 0
      }

      try {
        const randomDelay = Math.random() * (settings.delayMax - settings.delayMin) + settings.delayMin
        await this.sleep(randomDelay)

        await bot.sendMessage(group.id, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        })

        success++
        messageCount++
        results.push({ groupId: group.id, status: "SUCCESS" })
        DataManager.log("BROADCAST_SUCCESS", `Pesan dikirim ke ${group.name}`)
      } catch (error) {
        failed++
        results.push({ groupId: group.id, status: "FAILED", error: error.message })
        DataManager.log("BROADCAST_FAILED", `Gagal kirim ke ${group.name}: ${error.message}`)
      }
    }

    DataManager.log("BROADCAST_COMPLETE", `Berhasil: ${success}, Gagal: ${failed}`)
    return { success, failed, results }
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ==================== KEYBOARD MANAGER ====================
class KeyboardManager {
  static getMainMenu() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📣 Sebar Pesan", callback_data: "broadcast_menu" },
            { text: "➕ Tambah Grup", callback_data: "add_group_start" },
          ],
          [
            { text: "📜 List Grup", callback_data: "list_groups" },
            { text: "❌ Hapus Grup", callback_data: "delete_group_start" },
          ],
          [
            { text: "⚙️ Atur Delay", callback_data: "settings_delay" },
            { text: "⏰ Timer", callback_data: "timer_menu" },
          ],
          [
            { text: "💾 Backup Session", callback_data: "backup_session" },
            { text: "📋 Lihat Log", callback_data: "view_logs" },
          ],
        ],
      },
    }
  }

  static getBroadcastMenu() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Ke Semua Grup", callback_data: "broadcast_all" },
            { text: "Ke Grup Tertentu", callback_data: "broadcast_select" },
          ],
          [{ text: "◀️ Kembali", callback_data: "back_menu" }],
        ],
      },
    }
  }

  static getGroupsList(groups) {
    const buttons = groups.map((group, index) => [
      { text: `${index + 1}. ${group.name}`, callback_data: `group_info_${group.id}` },
    ])
    buttons.push([{ text: "◀️ Kembali", callback_data: "back_menu" }])
    return {
      reply_markup: { inline_keyboard: buttons },
    }
  }

  static getTimerMenu() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⏱️ 5 Menit", callback_data: "timer_5m" },
            { text: "⏱️ 10 Menit", callback_data: "timer_10m" },
          ],
          [
            { text: "⏱️ 30 Menit", callback_data: "timer_30m" },
            { text: "⏱️ 1 Jam", callback_data: "timer_1h" },
          ],
          [
            { text: "⏱️ Custom", callback_data: "timer_custom" },
            { text: "🛑 Batalkan", callback_data: "timer_cancel" },
          ],
          [{ text: "◀️ Kembali", callback_data: "back_menu" }],
        ],
      },
    }
  }

  static getSettingsMenu() {
    const settings = DataManager.getSettings()
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `Delay Min: ${settings.delayMin}ms`, callback_data: "delay_min_edit" },
            { text: `Delay Max: ${settings.delayMax}ms`, callback_data: "delay_max_edit" },
          ],
          [{ text: `Rate Limit: ${settings.maxMessagesPerMinute}/min`, callback_data: "rate_limit_edit" }],
          [
            { text: `Auto Join: ${settings.autoJoinEnabled ? "✅" : "❌"}`, callback_data: "toggle_autojoin" },
            { text: `Broadcast: ${settings.broadcastEnabled ? "✅" : "❌"}`, callback_data: "toggle_broadcast" },
          ],
          [{ text: "◀️ Kembali", callback_data: "back_menu" }],
        ],
      },
    }
  }
}

// ==================== TIMER MANAGER ====================
const timers = {}

function scheduleMessage(groupIds, message, delayMs) {
  const timerId = Date.now()
  const targetTime = new Date(Date.now() + delayMs)

  timers[timerId] = {
    id: timerId,
    groupIds,
    message,
    targetTime,
    scheduled: true,
  }

  setTimeout(async () => {
    const result = await BroadcastManager.broadcastMessage(message, groupIds)
    DataManager.log(
      "SCHEDULED_BROADCAST",
      `Broadcast terjadwal selesai: ${result.success} berhasil, ${result.failed} gagal`,
    )
    delete timers[timerId]
  }, delayMs)

  return timerId
}

// ==================== BOT HANDLERS ====================

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const userName = msg.from.first_name || "User"

  const welcomeText =
    `🤖 Selamat datang, <b>${userName}!</b>\n\n` +
    `Bot ini membantu Anda untuk:\n` +
    `📣 Menyebarkan pesan ke multiple grup\n` +
    `🔄 Mengelola grup-grup Anda\n` +
    `⏰ Menjadwalkan pengiriman pesan\n` +
    `🛡️ Anti-spam dengan delay random\n` +
    `💾 Backup sesi login\n\n` +
    `<b>Pilih menu di bawah untuk memulai:</b>`

  bot.sendMessage(chatId, welcomeText, KeyboardManager.getMainMenu())
  DataManager.log("BOT_START", `User ${userName} (${chatId}) memulai bot`)
})

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id
  const helpText =
    `<b>📖 Panduan Penggunaan:</b>\n\n` +
    `<b>📣 Sebar Pesan:</b>\n` +
    `Kirim pesan ke semua atau grup tertentu dengan delay random untuk keamanan.\n\n` +
    `<b>➕ Tambah Grup:</b>\n` +
    `Tambahkan grup dengan ID atau nama grup.\n\n` +
    `<b>📜 List Grup:</b>\n` +
    `Lihat semua grup yang sudah ditambahkan.\n\n` +
    `<b>⚙️ Atur Delay:</b>\n` +
    `Atur jeda antar pengiriman (untuk anti-spam).\n\n` +
    `<b>⏰ Timer:</b>\n` +
    `Jadwalkan pengiriman pesan pada waktu tertentu.\n\n` +
    `<b>💾 Backup Session:</b>\n` +
    `Simpan sesi login Anda untuk backup.\n\n` +
    `<b>🛡️ Keamanan:</b>\n` +
    `Bot menggunakan delay random & rate limiting untuk mencegah blokir Telegram.`

  bot.sendMessage(chatId, helpText, KeyboardManager.getMainMenu())
})

// Callback query handler
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id
  const data = query.data

  try {
    if (data === "back_menu") {
      bot.editMessageText("🤖 <b>Menu Utama</b>\n\nPilih opsi yang ingin Anda gunakan:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        ...KeyboardManager.getMainMenu(),
      })
    }
    // Broadcast menu
    else if (data === "broadcast_menu") {
      bot.editMessageText("📣 <b>Menu Penyebaran Pesan</b>\n\nPilih target penyebaran:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        ...KeyboardManager.getBroadcastMenu(),
      })
    }
    // Broadcast ke semua grup
    else if (data === "broadcast_all") {
      bot.sendMessage(
        chatId,
        "📝 Silakan kirim pesan yang ingin disebarkan ke semua grup:\n\n<i>(Pesan Anda akan dikirim ke semua grup dengan delay random)</i>",
        {
          parse_mode: "HTML",
        },
      )

      bot.once("message", async (msg) => {
        if (msg.text === "/start" || msg.text.startsWith("/")) return

        const groups = DataManager.getGroups()
        if (groups.length === 0) {
          bot.sendMessage(chatId, "❌ Tidak ada grup yang ditambahkan. Tambahkan grup terlebih dahulu.")
          return
        }

        bot.sendMessage(chatId, "⏳ Mengirim pesan ke semua grup...")
        const result = await BroadcastManager.broadcastMessage(msg.text)

        const statusText =
          `✅ <b>Status Penyebaran</b>\n\n` +
          `📨 Berhasil: <b>${result.success}</b>\n` +
          `❌ Gagal: <b>${result.failed}</b>\n` +
          `📊 Total: <b>${groups.length}</b>\n\n` +
          `<b>Detail:</b>\n${result.results.map((r) => `${r.status === "SUCCESS" ? "✅" : "❌"} Grup ${r.groupId}`).join("\n")}`

        bot.sendMessage(chatId, statusText, {
          parse_mode: "HTML",
          ...KeyboardManager.getMainMenu(),
        })
      })
    }
    // List groups
    else if (data === "list_groups") {
      const groups = DataManager.getGroups()
      if (groups.length === 0) {
        bot.sendMessage(chatId, "📭 Belum ada grup yang ditambahkan.", KeyboardManager.getMainMenu())
      } else {
        const groupList = groups
          .map(
            (g, i) =>
              `${i + 1}. <b>${g.name}</b>\n   ID: <code>${g.id}</code>\n   Ditambahkan: ${new Date(g.addedAt).toLocaleString()}`,
          )
          .join("\n\n")

        bot.sendMessage(chatId, `📜 <b>Daftar Grup (${groups.length})</b>\n\n${groupList}`, {
          parse_mode: "HTML",
          ...KeyboardManager.getMainMenu(),
        })
      }
    }
    // Add group start
    else if (data === "add_group_start") {
      bot.sendMessage(
        chatId,
        "➕ <b>Tambah Grup</b>\n\nSilakan kirim ID grup atau link grup Telegram:\n\n<i>Format ID: -1001234567890</i>\n<i>Atau kirim link: https://t.me/groupname</i>",
        {
          parse_mode: "HTML",
        },
      )

      bot.once("message", async (msg) => {
        if (msg.text === "/start" || msg.text.startsWith("/")) return

        const groupId = msg.text.trim()

        // Parse link grup
        if (groupId.includes("t.me/")) {
          const match = groupId.match(/t\.me\/([a-zA-Z0-9_]+)/)
          if (match) {
            // Ini adalah link publik, kita perlu mengubahnya ke ID
            bot.sendMessage(chatId, "⚠️ Untuk grup publik, silakan kirim ID grup numerik atau gunakan fitur auto-join.")
            return
          }
        }

        // Validasi format ID
        if (isNaN(groupId)) {
          bot.sendMessage(chatId, "❌ Format ID tidak valid. Harus berupa angka.")
          return
        }

        const groupName = `Grup ${groupId}`
        if (DataManager.addGroup(groupId, groupName)) {
          bot.sendMessage(
            chatId,
            `✅ <b>Grup berhasil ditambahkan!</b>\n\nNama: ${groupName}\nID: <code>${groupId}</code>`,
            {
              parse_mode: "HTML",
              ...KeyboardManager.getMainMenu(),
            },
          )
        } else {
          bot.sendMessage(chatId, "⚠️ Grup sudah ada di daftar.", KeyboardManager.getMainMenu())
        }
      })
    }
    // Delete group start
    else if (data === "delete_group_start") {
      const groups = DataManager.getGroups()
      if (groups.length === 0) {
        bot.sendMessage(chatId, "📭 Tidak ada grup untuk dihapus.", KeyboardManager.getMainMenu())
      } else {
        bot.sendMessage(chatId, "❌ <b>Hapus Grup</b>\n\nSilakan kirim ID grup yang ingin dihapus:", {
          parse_mode: "HTML",
        })

        bot.once("message", (msg) => {
          const groupId = msg.text.trim()
          if (DataManager.removeGroup(groupId)) {
            bot.sendMessage(chatId, `✅ Grup ${groupId} berhasil dihapus.`, KeyboardManager.getMainMenu())
          } else {
            bot.sendMessage(chatId, "❌ Grup tidak ditemukan.", KeyboardManager.getMainMenu())
          }
        })
      }
    }
    // Settings delay
    else if (data === "settings_delay") {
      bot.editMessageText("⚙️ <b>Pengaturan Delay</b>\n\nAtur jeda antar pengiriman untuk mencegah spam:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        ...KeyboardManager.getSettingsMenu(),
      })
    }
    // Edit delay min
    else if (data === "delay_min_edit") {
      bot.sendMessage(chatId, "⏱️ Masukkan delay minimum (ms):\n\n<i>Contoh: 500</i>", {
        parse_mode: "HTML",
      })

      bot.once("message", (msg) => {
        const delayMin = Number.parseInt(msg.text)
        if (!isNaN(delayMin) && delayMin > 0) {
          const settings = DataManager.getSettings()
          settings.delayMin = delayMin
          DataManager.saveSettings(settings)
          bot.sendMessage(chatId, `✅ Delay minimum diatur ke ${delayMin}ms`, KeyboardManager.getMainMenu())
        } else {
          bot.sendMessage(chatId, "❌ Format tidak valid.", KeyboardManager.getMainMenu())
        }
      })
    }
    // Edit delay max
    else if (data === "delay_max_edit") {
      bot.sendMessage(chatId, "⏱️ Masukkan delay maksimum (ms):\n\n<i>Contoh: 2000</i>", {
        parse_mode: "HTML",
      })

      bot.once("message", (msg) => {
        const delayMax = Number.parseInt(msg.text)
        if (!isNaN(delayMax) && delayMax > 0) {
          const settings = DataManager.getSettings()
          settings.delayMax = delayMax
          DataManager.saveSettings(settings)
          bot.sendMessage(chatId, `✅ Delay maksimum diatur ke ${delayMax}ms`, KeyboardManager.getMainMenu())
        } else {
          bot.sendMessage(chatId, "❌ Format tidak valid.", KeyboardManager.getMainMenu())
        }
      })
    }
    // Toggle auto join
    else if (data === "toggle_autojoin") {
      const settings = DataManager.getSettings()
      settings.autoJoinEnabled = !settings.autoJoinEnabled
      DataManager.saveSettings(settings)
      bot.editMessageText(
        `⚙️ <b>Pengaturan Delay</b>\n\n✅ Auto Join diubah menjadi: <b>${settings.autoJoinEnabled ? "AKTIF" : "NONAKTIF"}</b>`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "HTML",
          ...KeyboardManager.getSettingsMenu(),
        },
      )
    }
    // Toggle broadcast
    else if (data === "toggle_broadcast") {
      const settings = DataManager.getSettings()
      settings.broadcastEnabled = !settings.broadcastEnabled
      DataManager.saveSettings(settings)
      bot.editMessageText(
        `⚙️ <b>Pengaturan Delay</b>\n\n✅ Broadcast diubah menjadi: <b>${settings.broadcastEnabled ? "AKTIF" : "NONAKTIF"}</b>`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "HTML",
          ...KeyboardManager.getSettingsMenu(),
        },
      )
    }
    // Timer menu
    else if (data === "timer_menu") {
      bot.editMessageText("⏰ <b>Penjadwalan Pesan</b>\n\nPilih waktu penundaan untuk mengirim pesan:", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        ...KeyboardManager.getTimerMenu(),
      })
    }
    // Timer options
    else if (data.startsWith("timer_")) {
      const timerOptions = {
        timer_5m: 5 * 60 * 1000,
        timer_10m: 10 * 60 * 1000,
        timer_30m: 30 * 60 * 1000,
        timer_1h: 60 * 60 * 1000,
      }

      if (data === "timer_custom") {
        bot.sendMessage(chatId, "⏱️ Masukkan durasi (dalam menit):\n\n<i>Contoh: 30</i>", {
          parse_mode: "HTML",
        })

        bot.once("message", (msg) => {
          const minutes = Number.parseInt(msg.text)
          if (!isNaN(minutes) && minutes > 0) {
            bot.sendMessage(chatId, "📝 Sekarang silakan kirim pesan yang ingin dijadwalkan:", {
              parse_mode: "HTML",
            })

            bot.once("message", async (msgContent) => {
              const delayMs = minutes * 60 * 1000
              const groups = DataManager.getGroups()
              if (groups.length === 0) {
                bot.sendMessage(chatId, "❌ Tidak ada grup untuk dikirim pesan.")
                return
              }

              const timerId = scheduleMessage(
                groups.map((g) => g.id),
                msgContent.text,
                delayMs,
              )

              const targetTime = new Date(Date.now() + delayMs).toLocaleString()
              bot.sendMessage(
                chatId,
                `✅ <b>Pesan dijadwalkan!</b>\n\n` +
                  `⏱️ Akan dikirim dalam: <b>${minutes} menit</b>\n` +
                  `🕐 Waktu pengiriman: <b>${targetTime}</b>\n` +
                  `📊 Target grup: <b>${groups.length}</b>`,
                {
                  parse_mode: "HTML",
                  ...KeyboardManager.getMainMenu(),
                },
              )
              DataManager.log("SCHEDULED_MESSAGE", `Pesan dijadwalkan untuk ${minutes} menit ke depan`)
            })
          }
        })
      } else if (data === "timer_cancel") {
        // Batalkan semua timer
        const cancelCount = Object.keys(timers).length
        Object.keys(timers).forEach((id) => delete timers[id])
        bot.sendMessage(chatId, `✅ ${cancelCount} penjadwalan pesan dibatalkan.`, KeyboardManager.getMainMenu())
        DataManager.log("TIMERS_CANCELLED", `${cancelCount} timer dibatalkan`)
      } else if (timerOptions[data]) {
        const delayMs = timerOptions[data]
        const minutes = delayMs / (60 * 1000)

        bot.sendMessage(chatId, "📝 Silakan kirim pesan yang ingin dijadwalkan:", {
          parse_mode: "HTML",
        })

        bot.once("message", async (msgContent) => {
          const groups = DataManager.getGroups()
          if (groups.length === 0) {
            bot.sendMessage(chatId, "❌ Tidak ada grup untuk dikirim pesan.")
            return
          }

          const timerId = scheduleMessage(
            groups.map((g) => g.id),
            msgContent.text,
            delayMs,
          )

          const targetTime = new Date(Date.now() + delayMs).toLocaleString()
          bot.sendMessage(
            chatId,
            `✅ <b>Pesan dijadwalkan!</b>\n\n` +
              `⏱️ Akan dikirim dalam: <b>${minutes} menit</b>\n` +
              `🕐 Waktu pengiriman: <b>${targetTime}</b>\n` +
              `📊 Target grup: <b>${groups.length}</b>`,
            {
              parse_mode: "HTML",
              ...KeyboardManager.getMainMenu(),
            },
          )
          DataManager.log("SCHEDULED_MESSAGE", `Pesan dijadwalkan untuk ${minutes} menit ke depan`)
        })
      }
    }
    // Backup session
    else if (data === "backup_session") {
      const sessionData = {
        backupTime: new Date().toISOString(),
        groups: DataManager.getGroups().length,
        settings: DataManager.getSettings(),
        botStatus: "ACTIVE",
      }

      DataManager.saveSession(sessionData)
      bot.sendMessage(
        chatId,
        `💾 <b>Backup Sesi Berhasil!</b>\n\n` +
          `⏱️ Waktu: ${new Date().toLocaleString()}\n` +
          `📊 Grup disimpan: ${sessionData.groups}\n` +
          `📁 File: session.json\n\n` +
          `<i>Sesi Anda telah aman disimpan di server bot.</i>`,
        {
          parse_mode: "HTML",
          ...KeyboardManager.getMainMenu(),
        },
      )
    }
    // View logs
    else if (data === "view_logs") {
      const logContent = fs.existsSync(LOG_FILE)
        ? fs.readFileSync(LOG_FILE, "utf8").split("\n").slice(-20).join("\n")
        : "Belum ada log aktivitas"

      bot.sendMessage(chatId, `📋 <b>Log Aktivitas (20 baris terakhir)</b>\n\n<code>${logContent}</code>`, {
        parse_mode: "HTML",
        ...KeyboardManager.getMainMenu(),
      })
    }

    bot.answerCallbackQuery(query.id)
  } catch (error) {
    console.error("Error handling callback:", error)
    DataManager.log("CALLBACK_ERROR", error.message)
  }
})

// Error handling
bot.on("polling_error", (error) => {
  DataManager.log("POLLING_ERROR", error.message)
})

console.log("🚀 Bot Telegram dimulai...")
console.log("📝 Pastikan TELEGRAM_BOT_TOKEN ada di file .env")
DataManager.log("BOT_STARTED", "Bot Telegram mulai berjalan")
