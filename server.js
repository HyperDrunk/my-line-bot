const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

// إعدادات LINE - سنضع مفاتيحك هنا لاحقاً
const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN', // سنغير هذا
  channelSecret: 'YOUR_CHANNEL_SECRET' // سنغير هذا
};

const client = new line.Client(config);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// معالجة Webhook من LINE
app.post('/webhook', (req, res) => {
  console.log('✅ تم استقبال طلب من LINE!');
  
  // تحقق من التوقيع للأمان
  const signature = req.get('x-line-signature');
  if (!signature) {
    return res.status(401).send('Unauthorized');
  }
  
  // رد سريع لـ LINE
  res.status(200).send('OK');
  
  // معالجة الأحداث
  const events = req.body.events;
  events.forEach(event => {
    handleEvent(event);
  });
});

// معالجة مختلف أنواع الأحداث
async function handleEvent(event) {
  console.log('📩 حدث جديد:', event.type);
  
  if (event.type === 'message') {
    return handleMessage(event);
  }
  
  if (event.type === 'follow') {
    return handleFollow(event);
  }
}

// معالجة الرسائل
async function handleMessage(event) {
  const userMessage = event.message.text;
  const replyToken = event.replyToken;
  
  console.log(`👤 المستخدم قال: ${userMessage}`);
  
  let replyText = '';
  
  // ردود ذكية حسب الرسالة
  if (userMessage.includes('مرحبا') || userMessage.includes('اهلا')) {
    replyText = 'مرحبا بك! 😊 كيف يمكنني مساعدتك؟';
  } else if (userMessage.includes('شكرا')) {
    replyText = 'العفو! 🤗 سعيد لخدمتك';
  } else {
    replyText = `لقد قلت: "${userMessage}" - هذه بداية رائعة للبوت! 🚀`;
  }
  
  // إرسال الرد
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: replyText
    });
    console.log('✅ تم إرسال الرد بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إرسال الرد:', error);
  }
}

// معالجة متابعة البوت
async function handleFollow(event) {
  const replyToken = event.replyToken;
  
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'شكراً لمتابعة البوت! 🎉 أرسل أي رسالة وسأرد عليك.'
    });
    console.log('✅ تم ترحيب متابع جديد');
  } catch (error) {
    console.error('❌ خطأ في ترحيب المتابع:', error);
  }
}

// صفحة رئيسية للاختبار
app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل! استخدم /webhook للـ LINE');
});

// التشغيل على البورت المحدد من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على البورت ${PORT}`);
});
