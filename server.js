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
  bannedWords: ['سوق', 'بيع', 'شراء', 'إعلان', 'سبام', 'spam', 'منتج', 'عرض'],
  maxWarnings: 3,
  autoMute: true // ⬅️ نظام كتم تلقائي بدل الطرد
};

// تخزين البيانات
const userWarnings = new Map();
const mutedUsers = new Map();
const groupMembers = new Map();

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

  // 🔍 التحقق إذا كان المستخدم مكتوماً
  if (isUserMuted(userId, groupId)) {
    // حذف رسالة المستخدم المكتوم (لا يمكن فعلياً، لكن نمنع التفاعل)
    console.log(`🔇 رسالة من مستخدم مكتوم: ${userId}`);
    return;
  }

  // 🛡️ أوامر المشرفين
  if (isAdmin) {
    if (userMessage.startsWith('!كتم ')) {
      handleMuteCommand(event, userMessage, groupId);
      return;
    }
    
    if (userMessage.startsWith('!فك_كتم ')) {
      handleUnmuteCommand(event, userMessage, groupId);
      return;
    }
    
    if (userMessage === '!قائمة') {
      showMembersList(event, groupId);
      return;
    }
    
    if (userMessage === '!المكتومين') {
      showMutedUsers(event, groupId);
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

    if (userMessage === '!تحديث') {
      updateAllMembers(event, groupId);
      return;
    }
  }

  // 🔍 كشف الكلمات الممنوعة
  const hasBannedWord = securitySettings.bannedWords.some(word => 
    userMessage.toLowerCase().includes(word.toLowerCase())
  );

  if (hasBannedWord) {
    handleViolation(userId, userMessage, replyToken, groupId);
    return;
  }

  // 📝 الردود العادية
  if (userMessage.includes('بوت') || userMessage.includes('!قواعد')) {
    handleNormalReply(event, userMessage, isAdmin);
  }
}

// 🔇 كتم عضو
async function handleMuteCommand(event, userMessage, groupId) {
  const nameMatch = userMessage.match(/!كتم\s+(.+)/);
  
  if (!nameMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !كتم اسم_الشخص\n\n📝 أمثلة:\n!كتم فيمتو\n!كتم أحمد'
    });
    return;
  }

  const targetName = nameMatch[1].trim().toLowerCase();
  
  await updateAllMembers(event, groupId);
  const members = groupMembers.get(groupId);
  
  if (!members) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين'
    });
    return;
  }

  // البحث عن العضو
  let foundMember = null;
  for (const [memberId, memberData] of members) {
    if (memberData.displayName && 
        memberData.displayName.toLowerCase().includes(targetName)) {
      foundMember = memberData;
      break;
    }
  }

  if (!foundMember) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ لم أجد "${targetName}" في الأعضاء`
    });
    return;
  }

  // كتم العضو
  muteUser(foundMember.userId, groupId, foundMember.displayName);
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🔇 تم كتم "${foundMember.displayName}"\n\nسيتم تجاهل جميع رسائله تلقائياً`
  });
}

// 🔊 فك كتم عضو
async function handleUnmuteCommand(event, userMessage, groupId) {
  const nameMatch = userMessage.match(/!فك_كتم\s+(.+)/);
  
  if (!nameMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !فك_كتم اسم_الشخص'
    });
    return;
  }

  const targetName = nameMatch[1].trim().toLowerCase();
  const mutedUser = findMutedUserByName(targetName, groupId);
  
  if (!mutedUser) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ "${targetName}" غير مكتوم`
    });
    return;
  }

  unmuteUser(mutedUser.userId, groupId);
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🔊 تم فك كتم "${mutedUser.displayName}"`
  });
}

// 🔇 نظام الكتم
function muteUser(userId, groupId, displayName) {
  if (!mutedUsers.has(groupId)) {
    mutedUsers.set(groupId, new Map());
  }
  
  const groupMuted = mutedUsers.get(groupId);
  groupMuted.set(userId, {
    userId: userId,
    displayName: displayName,
    mutedAt: new Date(),
    mutedBy: 'system'
  });
}

function unmuteUser(userId, groupId) {
  if (mutedUsers.has(groupId)) {
    mutedUsers.get(groupId).delete(userId);
  }
}

function isUserMuted(userId, groupId) {
  return mutedUsers.has(groupId) && mutedUsers.get(groupId).has(userId);
}

function findMutedUserByName(targetName, groupId) {
  if (!mutedUsers.has(groupId)) return null;
  
  const groupMuted = mutedUsers.get(groupId);
  for (const [userId, muteData] of groupMuted) {
    if (muteData.displayName && 
        muteData.displayName.toLowerCase().includes(targetName)) {
      return muteData;
    }
  }
  return null;
}

// ⚠️ معالجة المخالفات
function handleViolation(userId, message, replyToken, groupId) {
  const warnings = (userWarnings.get(userId) || 0) + 1;
  userWarnings.set(userId, warnings);

  let responseText = `⚠️ تحذير ${warnings}/${securitySettings.maxWarnings}: كلمة ممنوعة!`;
  
  if (warnings >= securitySettings.maxWarnings && securitySettings.autoMute) {
    // كتم تلقائي بعد 3 تحذيرات
    const member = groupMembers.get(groupId)?.get(userId);
    if (member) {
      muteUser(userId, groupId, member.displayName);
      responseText = `🚫 تم كتم "${member.displayName}" تلقائياً بعد ${warnings} تحذيرات`;
      
      // إشعار المشرفين
      notifyAdmins(groupId, `🚨 تم كتم ${member.displayName} تلقائياً`);
    }
  }

  client.replyMessage(replyToken, {
    type: 'text',
    text: responseText
  });
}

// 📢 إشعار المشرفين
function notifyAdmins(groupId, message) {
  securitySettings.admins.forEach(adminId => {
    client.pushMessage(adminId, {
      type: 'text',
      text: `${message}\n\nالمجموعة: ${groupId}`
    }).catch(error => console.log('❌ لا يمكن إرسال إشعار للمشرف'));
  });
}

// 📋 عرض الأعضاء المكتومين
function showMutedUsers(event, groupId) {
  if (!mutedUsers.has(groupId) || mutedUsers.get(groupId).size === 0) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '✅ لا يوجد أعضاء مكتومين'
    });
    return;
  }

  let mutedText = '🔇 الأعضاء المكتومين:\n\n';
  const groupMuted = mutedUsers.get(groupId);
  
  let count = 1;
  for (const [userId, muteData] of groupMuted) {
    mutedText += `${count}. ${muteData.displayName}\n`;
    count++;
  }
  
  mutedText += `\nلفك الكتم: !فك_كتم اسم_الشخص`;

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: mutedText
  });
}

// 🔄 تحديث جميع الأعضاء
async function updateAllMembers(event, groupId) {
  try {
    const memberIds = await client.getGroupMemberIds(groupId);
    
    if (!groupMembers.has(groupId)) {
      groupMembers.set(groupId, new Map());
    }
    
    const members = groupMembers.get(groupId);
    
    for (const memberId of memberIds.memberIds) {
      try {
        const profile = await client.getGroupMemberProfile(groupId, memberId);
        members.set(memberId, {
          userId: memberId,
          displayName: profile.displayName,
          lastSeen: new Date()
        });
      } catch (error) {
        console.log('⚠️ خطأ في الحصول على بروفايل:', memberId);
      }
    }
    
    if (event && event.replyToken) {
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ تم تحديث ${members.size} عضو`
      });
    }
    
  } catch (error) {
    if (event && event.replyToken) {
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ لا يمكن تحديث قائمة الأعضاء'
      });
    }
  }
}

// 📜 عرض قائمة الأعضاء
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
    const muteStatus = isUserMuted(userId, groupId) ? ' 🔇' : '';
    membersText += `${count + 1}. ${memberData.displayName}${muteStatus}\n`;
    count++;
  }

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: membersText
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
    text: `👑 أوامر المشرفين (بدون طرد):
    
!كتم اسم - كتم عضو
!فك_كتم اسم - فك كتم عضو
!المكتومين - عرض المكتومين
!قائمة - عرض قائمة الأعضاء
!تحديث - تحديث قائمة الأعضاء
!حظر كلمة - حظر كلمة جديدة
!الاوامر - عرض هذه القائمة

📝 أمثلة:
!كتم فيمتو
!فك_كتم أحمد
!تحديث
!حظر سوق`
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
3. ❌ ممنوع المحتوى غير اللائق
4. ⚠️ 3 تحذيرات = كتم تلقائي`;
  }

  if (replyText) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  }
}

app.get('/', (req, res) => {
  res.send('🤖 بوت الحماية بنظام الكتم يعمل!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت الحماية بنظام الكتم شغال على البورت ${PORT}`);
});
