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

// 🔍 تخزين معلومات الأعضاء بالاسم
const groupMembers = new Map();
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
  // 🔥 الحصول على معلومات العضو عند إرسال رسالة
  if (event.type === 'message' && event.source.groupId) {
    updateMemberProfile(event.source.userId, event.source.groupId);
  }

  if (event.type === 'message' && event.message.type === 'text') {
    handleSmartMessage(event);
  }
}

// 📝 تحديث معلومات العضو
async function updateMemberProfile(userId, groupId) {
  try {
    const profile = await client.getGroupMemberProfile(groupId, userId);
    
    if (!groupMembers.has(groupId)) {
      groupMembers.set(groupId, new Map());
    }
    
    const members = groupMembers.get(groupId);
    members.set(userId, {
      userId: userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      lastSeen: new Date()
    });
    
  } catch (error) {
    console.log('⚠️ لا يمكن الحصول على بروفايل العضو:', userId);
  }
}

function handleSmartMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  const replyToken = event.replyToken;
  const isAdmin = securitySettings.admins.includes(userId);

  // 🛡️ أوامر المشرفين
  if (isAdmin) {
    if (userMessage.startsWith('!طرد ')) {
      handleKickByName(event, userMessage, groupId);
      return;
    }
    
    if (userMessage === '!قائمة') {
      showMembersList(event, groupId);
      return;
    }
    
    if (userMessage === '!تحديث') {
      updateAllMembers(event, groupId);
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
  }

  // 📝 الردود العادية
  if (userMessage.includes('بوت') || userMessage.includes('!قواعد')) {
    handleNormalReply(event, userMessage, isAdmin);
  }
}

// 🚫 طرد بالاسم
async function handleKickByName(event, userMessage, groupId) {
  const nameMatch = userMessage.match(/!طرد\s+(.+)/);
  
  if (!nameMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !طرد اسم_الشخص\n\n📝 أمثلة:\n!طرد فيمتو\n!طرد أحمد'
    });
    return;
  }

  const targetName = nameMatch[1].trim().toLowerCase();
  
  // تحديث قائمة الأعضاء أولاً
  await updateAllMembers(event, groupId);
  
  const members = groupMembers.get(groupId);
  if (!members || members.size === 0) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين\nاكتب !تحديث ثم جرب مرة أخرى'
    });
    return;
  }

  // البحث عن الأعضاء المطابقين للاسم
  const matchingMembers = [];
  
  for (const [memberId, memberData] of members) {
    if (memberData.displayName && 
        memberData.displayName.toLowerCase().includes(targetName)) {
      matchingMembers.push(memberData);
    }
  }

  if (matchingMembers.length === 0) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ لم أجد "${targetName}" في الأعضاء\nجرب !قائمة لرؤية الأسماء المتاحة`
    });
    return;
  }

  if (matchingMembers.length === 1) {
    // إذا وجد عضو واحد فقط، تأكيد الطرد مباشرة
    confirmKick(event, matchingMembers[0], groupId);
  } else {
    // إذا وجد أكثر من عضو، عرض قائمة للاختيار
    showMultipleMembers(event, matchingMembers, groupId, targetName);
  }
}

// 🔄 تحديث جميع الأعضاء
async function updateAllMembers(event, groupId) {
  try {
    const memberIds = await client.getGroupMemberIds(groupId);
    
    if (!groupMembers.has(groupId)) {
      groupMembers.set(groupId, new Map());
    }
    
    const members = groupMembers.get(groupId);
    
    // تحديث كل عضو
    for (const memberId of memberIds.memberIds) {
      try {
        const profile = await client.getGroupMemberProfile(groupId, memberId);
        members.set(memberId, {
          userId: memberId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          lastSeen: new Date()
        });
      } catch (error) {
        console.log('⚠️ خطأ في الحصول على بروفايل:', memberId);
      }
    }
    
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ تم تحديث ${members.size} عضو`
    });
    
  } catch (error) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يمكن تحديث قائمة الأعضاء - تأكد من صلاحيات البوت'
    });
  }
}

// 📋 عرض قائمة الأعضاء
function showMembersList(event, groupId) {
  const members = groupMembers.get(groupId);
  
  if (!members || members.size === 0) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين\nاكتب !تحديث أولاً'
    });
    return;
  }

  let membersText = `📋 الأعضاء (${members.size}):\n\n`;
  let count = 0;
  
  for (const [userId, memberData] of members) {
    if (count >= 15) {
      membersText += `\n...و ${members.size - 15} أعضاء آخرين`;
      break;
    }
    membersText += `${count + 1}. ${memberData.displayName || 'غير معروف'}\n`;
    count++;
  }
  
  membersText += `\n🔍 للطرد: !طرد اسم_الشخص`;

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: membersText
  });
}

// 👥 عرض أعضاء متعددين
function showMultipleMembers(event, members, groupId, searchName) {
  const buttons = members.slice(0, 4).map((member, index) => ({
    type: 'postback',
    label: `طرد ${member.displayName}`,
    data: `kick_${member.userId}`
  }));

  buttons.push({
    type: 'message',
    label: '❌ إلغاء',
    text: '!إلغاء'
  });

  const quickActions = {
    type: 'template',
    altText: 'اختر العضو للطرد',
    template: {
      type: 'buttons',
      text: `🔍 وجدت ${members.length} عضو باسم "${searchName}"\nاختر العضو للطرد:`,
      actions: buttons
    }
  };
  
  client.replyMessage(event.replyToken, quickActions);
}

// ✅ تأكيد الطرد
function confirmKick(event, member, groupId) {
  const quickActions = {
    type: 'template',
    altText: 'تأكيد الطرد',
    template: {
      type: 'buttons',
      text: `🚫 تأكيد طرد:\n${member.displayName}\n\nهل أنت متأكد؟`,
      actions: [
        {
          type: 'postback',
          label: '✅ نعم، طرد',
          data: `kick_${member.userId}`
        },
        {
          type: 'message',
          label: '❌ لا، إلغاء',
          text: '!إلغاء'
        }
      ]
    }
  };
  
  client.replyMessage(event.replyToken, quickActions);
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
    text: `👑 أوامر المشرفين:
    
!طرد اسم - طرد عضو بالاسم
!قائمة - عرض قائمة الأعضاء
!تحديث - تحديث قائمة الأعضاء
!حظر كلمة - حظر كلمة جديدة
!الاوامر - عرض هذه القائمة

📝 أمثلة:
!طرد فيمتو
!طرد أحمد
!تحديث
!حظر سوق`
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

// معالجة Postback للأزرار
function handlePostback(event) {
  if (event.postback.data.startsWith('kick_')) {
    const userId = event.postback.data.replace('kick_', '');
    const groupId = event.source.groupId;
    
    client.kickGroupMember(groupId, userId)
      .then(() => {
        client.replyMessage(event.replyToken, {
          type: 'text',
          text: '✅ تم طرد العضو بنجاح'
        });
      })
      .catch(error => {
        client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ فشل الطرد - تأكد من صلاحيات البوت'
        });
      });
  }
}

app.get('/', (req, res) => {
  res.send('🤖 بوت الحماية بنظام الأسماء يعمل!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت الحماية بنظام الأسماء شغال على البورت ${PORT}`);
});
