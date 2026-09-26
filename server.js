import express from "express";
import { Client } from "discord.js-selfbot-v13";
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from "@discordjs/voice";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot Server is Running 24/7!");
});

// تنظيف المتغيرات من أي مسافات
const TOKEN = (process.env.TOKEN || process.env.DISCORD_TOKEN || "").trim();
const CHANNEL_ID = (process.env.VOICE_CHANNEL_ID || process.env.CHANNEL_ID || "").trim();

// ترقيع مؤقت لتفادي مشكلة friend_source_flags في المكتبة
try {
  const ClientUserSettingManager = (await import("discord.js-selfbot-v13/src/managers/ClientUserSettingManager.js")).default;
  const originalPatch = ClientUserSettingManager.prototype._patch;
  ClientUserSettingManager.prototype._patch = function (data) {
    if (data && !data.friend_source_flags) {
      data.friend_source_flags = { all: false, mutual_guilds: false, mutual_friends: false };
    }
    return originalPatch.call(this, data);
  };
} catch (e) {
  // تجاوز في حال تعذر الترقيع المباشر
}

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
    console.error("❌ فشل تسجيل الدخول (التوكن غير صحيح أو تم حظره):", err.message);
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
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ خطأ غير معالج:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ استثناء غير متوقع:", err.message);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 الخادم يعمل على الرابط: http://localhost:${PORT}`);
  startBot();
});
