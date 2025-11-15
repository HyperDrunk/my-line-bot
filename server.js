const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

app.use(express.json());

// كود تشخيصي بسيط
app.post('/webhook', (req, res) => {
  console.log('🎯 🔥 🔥 🔥 وصل ويبهوك!', new Date().toISOString());
  console.log('📦 نوع الطلب:', req.method, req.url);
  console.log('👤 headers:', req.headers['x-line-signature']);
  
  if (req.body && req.body.events) {
    console.log('📩 عدد الأحداث:', req.body.events.length);
    req.body.events.forEach((event, index) => {
      console.log(`🔄 حدث ${index + 1}:`, event.type);
      if (event.type === 'message') {
        console.log(`💬 الرسالة: "${event.message.text}"`);
        
        // رد فوري
        client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'تشخيص: تم استلام - ' + event.message.text
        }).then(() => {
          console.log('✅ تم الرد التشخيصي');
        }).catch(error => {
          console.log('❌ خطأ في الرد:', error.message);
        });
      }
    });
  } else {
    console.log('📭 لا توجد events في البيانات');
  }
  
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل - جرب إرسال رسالة للتحقق');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم التشخيصي شغال على البورت ${PORT}`);
});
