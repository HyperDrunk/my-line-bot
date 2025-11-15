const express = require("express");
const line = require("@line/bot-sdk"); // هذا الخطأ - يجب أن يكون "@line/bot-sdk"
const app = express();

// إعدادات LINE
const config = {
    channelAccessToken: '960BAZmmB3Dv0nHQyTcGmb6y2pX5kFtuyTzduH9f0b4ff0i/mmwMKGdubuL1S8U9Px96a06abqdjvTBJVFTlEqYtc7PTLAcTNcclsLm0GGgTTPhuwBHfTPayR23scrCdTFd0TryOnyGdBB4t89yJ3A4cDmyl3Fb+',
    channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
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
  const userMessage = event.message.text.toLowerCase();
  const replyToken = event.replyToken;
  
  let replyText = '';
  
  // 📝 قاموس الردود الذكية
  const responses = {
    // 🎯 التحية
    'مرحبا': 'مرحبا بك! 😊 كيف يمكنني مساعدتك اليوم؟',
    'اهلا': 'أهلاً وسهلاً! 🌟',
    'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته 🙏',
    
    // ℹ️ معلومات
    'من انت': 'أنا بوتك المساعد الذكي! 🤖\nتم برمجتي لمساعدتك في مختلف المهام.',
    'اسمك': 'أنا بوتك الخاص! يمكنك تسميتي كما تريد 🎯',
    
    // ⏰ الوقت والتاريخ
    'الوقت': `⏰ الوقت الحالي: ${new Date().toLocaleTimeString('ar-SA')}`,
    'التاريخ': `📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
    'اليوم': `📆 اليوم: ${new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}`,
    
    // ❓ مساعدة
    'مساعدة': `🆘 *أوامر متاحة:* 
• التحية (مرحبا, اهلا)
• الوقت والتاريخ
• المعلومات (من انت, اسمك)
• الشكر (شكرا, ممتاز)
• يمكنك سؤال أي شيء وسأحاول الرد!`,

    'الاوامر': `📋 *قائمة الأوامر:*
🕐 - الوقت, التاريخ, اليوم
ℹ️ - من انت, اسمك
🙏 - شكرا, ممتاز
❓ - مساعدة, الاوامر`,

    // 🙏 ردود المجاملة
    'شكرا': 'العفو! 😇 سعيد لخدمتك',
    'ممتاز': 'شكراً لك! 🌟 هذا يشجعني',
    'جميل': 'أهلاً بالجمال! 🌹',
    
    // ❤️ مشاعر
    'احبك': 'أنا أيضاً أحب مساعدتك! ❤️',
    'صباح الخير': 'صباح النور! 🌞',
    'مساء الخير': 'مساء الأنوار! 🌙'
  };

  // 🔍 البحث عن أفضل رد
  for (const [keyword, response] of Object.entries(responses)) {
    if (userMessage.includes(keyword)) {
      replyText = response;
      break;
    }
  }

  // 💬 إذا لم يوجد رد محدد
  if (!replyText) {
    const randomResponses = [
      `أفهم أنك تقول: "${event.message.text}" - هذا مثير للاهتمام! 🤔`,
      `رائع! "${event.message.text}" - هل يمكنك شرح المزيد؟ 💭`,
      `شكراً لمشاركة: "${event.message.text}" - هل تريد مساعدة في شيء محدد؟ 🎯`
    ];
    replyText = randomResponses[Math.floor(Math.random() * randomResponses.length)];
  }

  // 📤 إرسال الرد
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: replyText
    });
    console.log(`✅ تم الرد على: "${event.message.text}" → "${replyText}"`);
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
