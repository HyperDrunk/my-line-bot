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

// معالجة الويبهوك
app.post('/webhook', (req, res) => {
  console.log('🎯 تم استقبال طلب من LINE');
  
  // رد سريع لـ LINE
  res.status(200).send('OK');
  
  // معالجة جميع الأحداث
  if (req.body && req.body.events) {
    req.body.events.forEach(event => {
      handleEvent(event);
    });
  }
});

// معالجة الأحداث
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  const userMessage = event.message.text.toLowerCase();
  const replyToken = event.replyToken;
  
  console.log('💬 المستخدم قال:', userMessage);

  let replyText = '';

  // 📝 نظام الردود الذكي
  if (userMessage.includes('مرحبا') || userMessage.includes('اهلا') || userMessage.includes('السلام')) {
    replyText = 'مرحبا بك! 😊 كيف يمكنني مساعدتك؟';
  } 
  else if (userMessage.includes('الوقت')) {
    replyText = `⏰ الوقت الحالي: ${new Date().toLocaleTimeString('ar-SA')}`;
  } 
  else if (userMessage.includes('التاريخ')) {
    replyText = `📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}`;
  } 
  else if (userMessage.includes('اليوم')) {
    replyText = `📆 اليوم: ${new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}`;
  }
  else if (userMessage.includes('من انت') || userMessage.includes('اسمك')) {
    replyText = 'أنا بوتك المساعد الذكي! 🤖\nيمكنني إخبارك بالوقت والتاريخ والرد على استفساراتك.';
  } 
  else if (userMessage.includes('مساعدة') || userMessage.includes('الاوامر')) {
    replyText = `🆘 *الأوامر المتاحة:*
⏰ "الوقت" - معرفة الوقت الحالي
📅 "التاريخ" - معرفة التاريخ
📆 "اليوم" - معرفة اليوم
🤖 "من انت" - تعريف البوت
🙏 "شكرا" - رد المجاملة`;
  } 
  else if (userMessage.includes('شكرا') || userMessage.includes('ممتاز')) {
    replyText = 'العفو! 😇 سعيد لخدمتك';
  } 
  else {
    replyText = `أفهم أنك تقول: "${event.message.text}"\n💭 جرب "مساعدة" لرؤية الأوامر المتاحة.`;
  }

  // إرسال الرد
  client.replyMessage(replyToken, {
    type: 'text',
    text: replyText
  })
  .then(() => {
    console.log('✅ تم إرسال الرد بنجاح');
  })
  .catch(error => {
    console.error('❌ خطأ في الإرسال:', error);
  });
}

// صفحة رئيسية للاختبار
app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل! أرسل رسالة على LINE لتجربته.');
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على البورت ${PORT}`);
});
