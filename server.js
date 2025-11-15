const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

// إعدادات LINE
const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

// 🔧 إعدادات بوت الحماية مع الصلاحيات
const securitySettings = {
  // المشرفون المسموح لهم باستخدام أوامر الطرد
  admins: ['YOUR_USER_ID'], // ⬅️ ضع رابطك هنا
  
  // كلمات ممنوعة
  bannedWords: ['سوق', 'بيع', 'شراء', 'إعلان', 'سبام'],
  
  // إعدادات الصمت
  silentMode: true
};

app.use(express.json());

// معالجة الويبهوك
app.post('/webhook', (req, res) => {
  res.status(200).send('OK');
  
  if (req.body && req.body.events) {
    req.body.events.forEach(event => {
      handleEvent(event);
    });
  }
});

// معالجة الأحداث
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    handleSmartMessage(event);
  }
}

// 🧠 معالجة ذكية للرسائل
function handleSmartMessage(event) {
  const userMessage = event.message.text.toLowerCase();
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  const replyToken = event.replyToken;
  
  // 🔍 التحقق إذا كان المستخدم مشرف
  const isAdmin = securitySettings.admins.includes(userId);
  
  // 🛡️ أوامر الطرد (للمشرفين فقط)
  if (isAdmin && userMessage.startsWith('!طرد')) {
    handleKickCommand(event, userMessage, groupId);
    return;
  }
  
  if (isAdmin && userMessage.startsWith('!حظر')) {
    handleBanCommand(event, userMessage, groupId);
    return;
  }
  
  // 📝 الردود العادية
  const shouldReply = userMessage.includes('بوت') || 
                     userMessage.includes('!قواعد') || 
                     userMessage.includes('!حماية');
  
  if (!shouldReply) return;
  
  let replyText = '';
  
  if (userMessage.includes('بوت')) {
    if (isAdmin) {
      replyText = '🛡️ أنا بوت الحماية - أنت مشرف\nالأوامر: !طرد @شخص | !حظر @شخص';
    } else {
      replyText = '🛡️ أنا بوت الحماية الصامت';
    }
  }
  else if (userMessage.includes('!قواعد')) {
    replyText = `📋 *قواعد المجموعة*:
1. ✅ الالتزام بالأدب والاحترام
2. ❌ ممنوع البيع أو الإعلان
3. ❌ ممنوع المحتوى غير اللائق`;
  }
  else if (userMessage.includes('!حماية')) {
    replyText = '🛡️ نظام الحماية نشط - البوت في الوضع الصامت';
  }
  
  if (replyText) {
    client.replyMessage(replyToken, {
      type: 'text',
      text: replyText
    });
  }
}

// 🚫 أمر طرد عضو
function handleKickCommand(event, userMessage, groupId) {
  // استخراج رابط العضو من الرسالة
  const mentionMatch = userMessage.match(/@(\S+)/);
  
  if (!mentionMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !طرد @رابط_العضو'
    });
    return;
  }
  
  const targetUserId = mentionMatch[1];
  
  // طرد العضو من المجموعة
  client.kickGroupMember(groupId, targetUserId)
    .then(() => {
      console.log(`✅ تم طرد العضو: ${targetUserId}`);
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ تم طرد العضو بنجاح`
      });
    })
    .catch(error => {
      console.error('❌ خطأ في الطرد:', error);
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ لم استطع طرد العضو - تأكد من الصلاحيات'
      });
    });
}

// ⚠️ أمر حظر كلمات
function handleBanCommand(event, userMessage, groupId) {
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

// صفحة رئيسية
app.get('/', (req, res) => {
  res.send('🤖 بوت الحماية مع صلاحيات الطرد يعمل!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت الحماية المتقدم شغال على البورت ${PORT}`);
});
