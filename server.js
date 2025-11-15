const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

// 🔧 إعدادات البوت
const securitySettings = {
  admins: ['U1f51a7685b725c6769f662c16ef3069a'],
  bannedWords: ['سوق', 'بيع', 'شراء', 'إعلان', 'سبام', 'spam'],
  maxWarnings: 3
};

const userWarnings = new Map();

app.use(express.json());

app.post('/webhook', (req, res) => {
  res.status(200).send('OK');
  if (req.body && req.body.events) {
    req.body.events.forEach(event => {
      handleEvent(event);
    });
  }
});

function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    handleSmartMessage(event);
  }
}

function handleSmartMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  const replyToken = event.replyToken;
  const isAdmin = securitySettings.admins.includes(userId);

  // 🛡️ أوامر المشرفين مع المنشن
  if (isAdmin) {
    if (userMessage.includes('!طرد @')) {
      handleKickByMention(event, userMessage, groupId);
      return;
    }
    
    if (userMessage.includes('!تحذير @')) {
      handleWarnByMention(event, userMessage);
      return;
    }
    
    if (userMessage.startsWith('!حظر ')) {
      handleBanCommand(event, userMessage);
      return;
    }
    
    if (userMessage === '!الاوامر') {
      showAdminCommands(event);
      return;
    }
  }

  // 🔍 كشف الكلمات الممنوعة
  const hasBannedWord = securitySettings.bannedWords.some(word => 
    userMessage.toLowerCase().includes(word.toLowerCase())
  );

  if (hasBannedWord) {
    handleViolation(userId, userMessage, replyToken);
    return;
  }

  // 📝 الردود العادية
  if (userMessage.includes('بوت') || userMessage.includes('!قواعد')) {
    handleNormalReply(event, userMessage, isAdmin);
  }
}

// 🚫 طرد بالمنشن
function handleKickByMention(event, userMessage, groupId) {
  // البحث عن المنشن في الرسالة
  const mentionMatch = userMessage.match(/!طرد @(\S+)/);
  
  if (!mentionMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !طرد @اسم_الشخص'
    });
    return;
  }

  const mentionedName = mentionMatch[1];
  
  // للحصول على معلومات الأعضاء (نحتاج طريقة أخرى)
  // حالياً سنستخدم طريقة بديلة
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🔍 جاري البحث عن "${mentionedName}" للطرد...\n\n⚠️ هذه الخاصية تحتاج تطوير إضافي`
  });
  
  // بديل عملي: استخدام قائمة الأعضاء
  handleAdvancedKick(event, mentionedName, groupId);
}

// 🚫 نظام طرد متقدم
function handleAdvancedKick(event, targetName, groupId) {
  // في LINE، لا يمكن الحصول على قائمة الأعضاء مباشرة
  // لذلك نستخدم طريقة بديلة
  
  const quickActions = {
    type: 'template',
    altText: 'خيارات الطرد',
    template: {
      type: 'buttons',
      text: `🚫 طرد "${targetName}"\n\nاختر طريقة الطرد:`,
      actions: [
        {
          type: 'message',
          label: '✅ تأكيد الطرد',
          text: `!تأكيد_طرد ${targetName}`
        },
        {
          type: 'message',
          label: '❌ إلغاء',
          text: '!إلغاء'
        }
      ]
    }
  };
  
  client.replyMessage(event.replyToken, quickActions);
}

// ⚠️ تحذير بالمنشن
function handleWarnByMention(event, userMessage) {
  const mentionMatch = userMessage.match(/!تحذير @(\S+)/);
  
  if (!mentionMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !تحذير @اسم_الشخص'
    });
    return;
  }

  const mentionedName = mentionMatch[1];
  
  // نستخدم اسم مؤقت للتحذير
  const tempUserId = `warn_${mentionedName}`;
  const warnings = (userWarnings.get(tempUserId) || 0) + 1;
  userWarnings.set(tempUserId, warnings);

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `⚠️ تم تحذير "${mentionedName}" (${warnings}/${securitySettings.maxWarnings})`
  });
}

// 🚫 أمر حظر كلمات
function handleBanCommand(event, userMessage) {
  const wordMatch = userMessage.match(/!حظر\s+(\S+)/);
  
  if (!wordMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !حظر كلمة'
    });
    return;
  }

  const bannedWord = wordMatch[1];
  securitySettings.bannedWords.push(bannedWord);

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ تم حظر الكلمة: "${bannedWord}"`
  });
}

// 📋 عرض أوامر المشرفين
function showAdminCommands(event) {
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `👑 أوامر المشرفين (نظام المنشن):
    
!طرد @اسم - طرد عضو بالمنشن
!تحذير @اسم - تحذير عضو بالمنشن  
!حظر كلمة - حظر كلمة جديدة
!الاوامر - عرض هذه القائمة

📝 مثال:
!طرد @فيمتو
!تحذير @أحمد
!حظر إعلان`
  });
}

// ⚠️ معالجة المخالفات
function handleViolation(userId, message, replyToken) {
  const warnings = (userWarnings.get(userId) || 0) + 1;
  userWarnings.set(userId, warnings);

  let responseText = `⚠️ تحذير ${warnings}/${securitySettings.maxWarnings}: كلمة ممنوعة!`;
  
  if (warnings >= securitySettings.maxWarnings) {
    responseText = `🚫 ${warnings} تحذيرات - العضو على وشك الطرد!`;
  }

  client.replyMessage(replyToken, {
    type: 'text',
    text: responseText
  });
}

// 💬 الردود العادية
function handleNormalReply(event, userMessage, isAdmin) {
  let replyText = '';

  if (userMessage.includes('بوت')) {
    replyText = isAdmin ? 
      '🛡️ بوت الحماية - أنت مشرف (اكتب !الاوامر)' : 
      '🛡️ أنا بوت الحماية الصامت';
  }
  else if (userMessage.includes('!قواعد')) {
    replyText = `📋 القواعد:
1. ✅ الالتزام بالأدب
2. ❌ ممنوع الإعلان
3. ❌ ممنوع المحتوى غير اللائق`;
  }

  if (replyText) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  }
}

// معالجة الأزرار والردود
function handlePostback(event) {
  if (event.postback.data === 'confirm_kick') {
    // معالجة تأكيد الطرد
  }
}

app.get('/', (req, res) => {
  res.send('🤖 بوت الحماية بنظام المنشن يعمل!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت الحماية بنظام المنشن شغال على البورت ${PORT}`);
});
