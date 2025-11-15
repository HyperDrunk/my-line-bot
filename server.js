const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

// إعدادات LINE
const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

app.use(express.json());

// ويبهوك بسيط
app.post('/webhook', (req, res) => {
  console.log('🎯 وصلت رسالة جديدة!');
  
  // رد سريع
  res.status(200).send('OK');
  
  // معالجة الرسائل
  if (req.body && req.body.events) {
    req.body.events.forEach(event => {
      if (event.type === 'message' && event.message.text) {
        console.log('💬 المستخدم قال:', event.message.text);
        
        // رد تلقائي
        client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'شكراً على رسالتك: ' + event.message.text
        });
      }
    });
  }
});

// صفحة رئيسية
app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل!');
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على البورت ${PORT}`);
});
