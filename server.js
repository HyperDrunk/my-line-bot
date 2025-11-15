const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

app.use(express.json());

app.post('/webhook', (req, res) => {
  res.status(200).send('OK');
  
  if (req.body && req.body.events) {
    req.body.events.forEach(event => {
      // 🔥 هذا الكود البسيط سيرسل لك User ID مباشرة
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text.toLowerCase();
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        
        if (userMessage === '!رابط' || userMessage === 'id' || userMessage === 'الرابط') {
          client.replyMessage(replyToken, {
            type: 'text',
            text: `🎯 User ID الخاص بك هو:\n${userId}\n\nانسخ هذا الرابط وضععه في الكود!`
          });
        }
      }
    });
  }
});

app.get('/', (req, res) => {
  res.send('🤖 البوت جاهز لإعطائك User ID - أرسل "!رابط"');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على البورت ${PORT}`);
});
