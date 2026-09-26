// server.js
import express from "express";
import { Client } from "discord.js-selfbot-v13";
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from "@discordjs/voice";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// تخزين البوتات النشطة
const activeBots = new Map();

// صفحة البداية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// نقطة نهاية لتشغيل البوت
app.post("/start-bot", async (req, res) => {
  const { token, channelId } = req.body;

  if (!token || !channelId) {
    return res.status(400).json({ error: "يجب إدخال التوكن ومعرف القناة الصوتية" });
  }

  // التحقق من عدم تشغيل البوت مسبقًا بنفس التوكن
  if (activeBots.has(token)) {
    return res.status(400).json({ error: "هذا البوت قيد التشغيل بالفعل" });
  }

  const client = new Client({ checkUpdate: false });

  try {
    await client.login(token);
    activeBots.set(token, client);

    // عند تسجيل الدخول بنجاح
    client.on("ready", async () => {
      console.log(`تم تسجيل الدخول باسم: ${client.user.tag}`);

      try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isVoice() || !channel.guild) {
          throw new Error("معرف القناة غير صحيح أو القناة ليست صوتية");
        }

        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
          selfMute: true,
          selfDeaf: true,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        console.log("تم دخول القناة الصوتية بنجاح");

        // إعادة المحاولة في حال انقطاع الاتصال
        connection.on(VoiceConnectionStatus.Disconnected, () => {
          console.log("انقطع الاتصال، إعادة المحاولة...");
          setTimeout(() => joinRoom(client, channelId), 10_000);
        });

        res.json({
          success: true,
          message: `البوت قيد التشغيل: ${client.user.tag}`,
          statusUrl: `/status?token=${encodeURIComponent(token)}`
        });

      } catch (error) {
        console.error("خطأ في دخول القناة الصوتية:", error.message);
        client.destroy();
        activeBots.delete(token);
        res.status(500).json({ error: "فشل في دخول القناة الصوتية" });
      }
    });

    // معالجة الأخطاء
    client.on("error", (error) => {
      if (error.message.includes("403") || error.message.includes("ban")) {
        console.error("الحساب تم حظره أو إيقافه.");
        activeBots.delete(token);
      }
    });

  } catch (error) {
    console.error("فشل تسجيل الدخول:", error.message);
    res.status(500).json({ error: "فشل تسجيل الدخول، تحقق من التوكن" });
  }
});

// نقطة نهاية للتحقق من حالة البوت
app.get("/status", (req, res) => {
  const { token } = req.query;
  if (!token || !activeBots.has(token)) {
    return res.status(404).json({ error: "البوت غير موجود أو متوقف" });
  }

  const client = activeBots.get(token);
  res.json({
    status: "online",
    username: client.user.tag,
    channelId: req.query.channelId || "غير معروف"
  });
});

// نقطة نهاية لإيقاف البوت
app.post("/stop-bot", (req, res) => {
  const { token } = req.body;
  if (!token || !activeBots.has(token)) {
    return res.status(404).json({ error: "البوت غير موجود" });
  }

  const client = activeBots.get(token);
  client.destroy();
  activeBots.delete(token);
  res.json({ success: true, message: "تم إيقاف البوت بنجاح" });
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على الرابط: http://localhost:${PORT}`);
});

// دالة لدخول القناة الصوتية
async function joinRoom(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isVoice() || !channel.guild) {
      throw new Error("معرف القناة غير صحيح");
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    console.log("تم إعادة دخول القناة الصوتية بنجاح");
  } catch (error) {
    console.error("خطأ في إعادة دخول القناة:", error.message);
  }
          }
