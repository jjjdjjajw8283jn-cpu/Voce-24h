import express from "express";
import { Client } from "discord.js-selfbot-v13";
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from "@discordjs/voice";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// صفحة بسيطة لمنع الخادم من التوقف
app.get("/", (req, res) => {
  res.send("Bot Server is Running 24/7!");
});

// قراءة التوكن والروم من Variables في Railway
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID || process.env.CHANNEL_ID;

async function startBot() {
  if (!TOKEN || !CHANNEL_ID) {
    console.error("❌ خطأ: لم يتم ضبط TOKEN أو VOICE_CHANNEL_ID في Railway Variables!");
    return;
  }

  const client = new Client({ checkUpdate: false });

  client.on("ready", async () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    await connectToVoice(client, CHANNEL_ID);
  });

  client.on("error", (error) => {
    console.error("❌ خطأ في البوت:", error.message);
  });

  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ فشل تسجيل الدخول (تحقق من التوكن):", err.message);
  }
}

async function connectToVoice(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isVoice() || !channel.guild) {
      console.error("❌ معرف القناة غير صحيح أو ليست قناة صوتية!");
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    console.log("🔊 تم دخول القناة الصوتية بنجاح والاستقرار فيها!");

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ انقطع الاتصال، إعادة المحاولة بعد 10 ثوانٍ...");
      setTimeout(() => connectToVoice(client, channelId), 10_000);
    });

  } catch (error) {
    console.error("❌ خطأ في دخول القناة الصوتية:", error.message);
    setTimeout(() => connectToVoice(client, channelId), 15_000);
  }
}

// تشغيل الخادم والبدء تلقائياً
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 الخادم يعمل على الرابط: http://localhost:${PORT}`);
  startBot();
});
