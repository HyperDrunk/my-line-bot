const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4Tf6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

// 🔧 إعدادات البوت الكاملة
const securitySettings = {
  admins: ['U1f51a7685b725c6769f662c16ef3069a'],
  
  // الكلمات الممنوعة
  bannedWords: ['سوق', 'بيع', 'شراء', 'إعلان', 'سبام', 'spam', 'منتج', 'عرض خاص'],
  
  // إعدادات الحماية
  autoKick: true,
  maxWarnings: 3,
  autoMute: true,
  
  // القوانين
  rules: `📋 *قوانين المجموعة*:
  
1. ✅ الالتزام بالأدب والاحترام
2. ❌ ممنوع الإعلان أو البيع
3. ❌ ممنوع المحتوى غير اللائق
4. ✅ المشاركة البناءة مرحب بها
5. ⚠️ 3 مخالفات = طرد تلقائي`,

  // الردود التلقائية
  autoReplies: {
    'اتشو': 'يرحمك الله يا قلبي 🤧',
    'الله يرحمك': 'ويغفر لك ويرحمنا أجمعين 🤲',
    'الحمدلله': 'الحمدلله دائماً وأبداً 🙏',
    'ما شاء الله': 'ما شاء الله تبارك الرحمن 🌟',
    'سبحان الله': 'سبحان الله وبحمده سبحان الله العظيم 🌿'
  }
};

// تخزين البيانات
const userWarnings = new Map();
const mutedUsers = new Map();
const groupMembers = new Map();
const bannedWords = new Set(securitySettings.bannedWords);

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

  if (event.type === 'memberJoined') {
    handleMemberJoin(event);
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
    console.log('⚠️ لا يمكن الحصول على بروفايل العضو');
  }
}

// 👋 ترحيب بالأعضاء الجدد
function handleMemberJoin(event) {
  const groupId = event.source.groupId;
  
  client.pushMessage(groupId, {
    type: 'text',
    text: `🎉 أهلاً وسهلاً بالعضو الجديد!\n\n${securitySettings.rules}\n\n💡 اكتب "قوانين" لرؤية القوانين`
  });
}

async function handleSmartMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  const replyToken = event.replyToken;
  const isAdmin = securitySettings.admins.includes(userId);

  // 🔥 إذا كان المستخدم مكتوماً، نتجاهل رسالته
  if (isUserMuted(userId, groupId)) {
    return;
  }

  // 🛡️ أوامر المشرفين
  if (isAdmin) {
    if (userMessage.startsWith('!طرد ')) {
      await handleKickCommand(event, userMessage, groupId);
      return;
    }
    
    if (userMessage.startsWith('!كتم ')) {
      await handleMuteCommand(event, userMessage, groupId);
      return;
    }
    
    if (userMessage.startsWith('!فك_كتم ')) {
      await handleUnmuteCommand(event, userMessage, groupId);
      return;
    }
    
    if (userMessage.startsWith('!حظر ')) {
      handleBanWordCommand(event, userMessage);
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
    
    if (userMessage === '!الكلمات_الممنوعة') {
      showBannedWords(event);
      return;
    }
    
    if (userMessage === '!تفعيل_الحماية') {
      checkBotAdminStatus(event, groupId);
      return;
    }
    
    if (userMessage === '!الاوامر') {
      showAdminCommands(event);
      return;
    }
  }

  // 📝 أوامر عامة للجميع
  if (userMessage === 'قوانين' || userMessage === 'القوانين') {
    showRules(event);
    return;
  }
  
  if (userMessage === 'مساعده' || userMessage === 'مساعدة') {
    showHelp(event, isAdmin);
    return;
  }
  
  if (userMessage === 'بوت' || userMessage === 'البوت') {
    showBotInfo(event, isAdmin);
    return;
  }

  // 💬 الردود التلقائية
  const autoReply = checkAutoReplies(userMessage);
  if (autoReply) {
    client.replyMessage(replyToken, {
      type: 'text',
      text: autoReply
    });
    return;
  }

  // 🔍 كشف الكلمات الممنوعة
  const hasBannedWord = checkBannedWords(userMessage);
  if (hasBannedWord) {
    handleViolation(userId, userMessage, replyToken, groupId);
    return;
  }
}

// 💬 التحقق من الردود التلقائية
function checkAutoReplies(message) {
  const lowerMessage = message.toLowerCase();
  for (const [keyword, response] of Object.entries(securitySettings.autoReplies)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return response;
    }
  }
  return null;
}

// 🔍 التحقق من الكلمات الممنوعة
function checkBannedWords(message) {
  const lowerMessage = message.toLowerCase();
  for (const word of bannedWords) {
    if (lowerMessage.includes(word.toLowerCase())) {
      return true;
    }
  }
  return false;
}

// 🚫 طرد عضو
async function handleKickCommand(event, userMessage, groupId) {
  const nameMatch = userMessage.match(/!طرد\s+(.+)/);
  
  if (!nameMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !طرد اسم_الشخص'
    });
    return;
  }

  const targetName = nameMatch[1].trim().toLowerCase();
  
  const members = groupMembers.get(groupId);
  
  if (!members) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين'
    });
    return;
  }

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

  try {
    await client.kickGroupMember(groupId, foundMember.userId);
    
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ تم طرد "${foundMember.displayName}" بنجاح!`
    });
    
    client.pushMessage(groupId, {
      type: 'text',
      text: `🚫 تم طرد ${foundMember.displayName} بواسطة نظام الحماية`
    });
    
  } catch (error) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ فشل طرد "${foundMember.displayName}" - البوت ليس مشرفاً`
    });
  }
}

// 🔇 كتم عضو
async function handleMuteCommand(event, userMessage, groupId) {
  const nameMatch = userMessage.match(/!كتم\s+(.+)/);
  
  if (!nameMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !كتم اسم_الشخص'
    });
    return;
  }

  const targetName = nameMatch[1].trim().toLowerCase();
  const members = groupMembers.get(groupId);
  
  if (!members) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين'
    });
    return;
  }

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

  muteUser(foundMember.userId, groupId, foundMember.displayName);
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🔇 تم كتم "${foundMember.displayName}"`
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

// 🚫 حظر كلمة جديدة
function handleBanWordCommand(event, userMessage) {
  const wordMatch = userMessage.match(/!حظر\s+(\S+)/);
  
  if (!wordMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !حظر كلمة'
    });
    return;
  }

  const bannedWord = wordMatch[1];
  bannedWords.add(bannedWord);
  
  securitySettings.bannedWords.push(bannedWord);

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ تم حظر الكلمة: "${bannedWord}"`
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
    mutedAt: new Date()
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
  
  if (warnings >= securitySettings.maxWarnings) {
    const member = groupMembers.get(groupId)?.get(userId);
    if (member) {
      responseText = `🚫 ${member.displayName} - تم تجاوز الحد المسموح!`;
      
      // محاولة الطرد التلقائي
      client.kickGroupMember(groupId, userId)
        .then(() => {
          client.pushMessage(groupId, {
            type: 'text',
            text: `🚫 تم طرد ${member.displayName} تلقائياً بعد ${warnings} مخالفات`
          });
        })
        .catch(error => {
          // إذا فشل الطرد، نستخدم الكتم
          muteUser(userId, groupId, member.displayName);
          client.pushMessage(groupId, {
            type: 'text',
            text: `🔇 تم كتم ${member.displayName} تلقائياً بعد ${warnings} مخالفات`
          });
        });
    }
  }

  client.replyMessage(replyToken, {
    type: 'text',
    text: responseText
  });
}

// 📋 عرض القوانين
function showRules(event) {
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: securitySettings.rules
  });
}

// 📞 عرض المساعدة
function showHelp(event, isAdmin) {
  let helpText = `🛡️ *بوت حماية المجموعات*\n\n`;
  
  if (isAdmin) {
    helpText += `👑 *أوامر المشرفين:*\n`;
    helpText += `!طرد اسم - طرد عضو\n`;
    helpText += `!كتم اسم - كتم عضو\n`;
    helpText += `!فك_كتم اسم - فك كتم\n`;
    helpText += `!حظر كلمة - حظر كلمة\n`;
    helpText += `!قائمة - عرض الأعضاء\n`;
    helpText += `!المكتومين - عرض المكتومين\n`;
    helpText += `!الكلمات_الممنوعة - عرض الكلمات\n`;
    helpText += `!الاوامر - عرض الأوامر\n\n`;
  }
  
  helpText += `📝 *أوامر عامة:*\n`;
  helpText += `قوانين - عرض القوانين\n`;
  helpText += `مساعدة - عرض هذه الرسالة\n`;
  helpText += `بوت - معلومات البوت\n\n`;
  helpText += `💬 *ردود تلقائية:*\n`;
  helpText += `اتشو ➝ يرحمك الله يا قلبي\n`;
  helpText += `الحمدلله ➝ الحمدلله دائماً\n`;
  helpText += `ما شاء الله ➝ ما شاء الله تبارك الرحمن`;

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: helpText
  });
}

// 🤖 معلومات البوت
function showBotInfo(event, isAdmin) {
  let infoText = `🤖 *بوت الحماية الذكي*\n\n`;
  infoText += `🛡️ نظام حماية متكامل\n`;
  infoText += `🚫 كشف الكلمات الممنوعة\n`;
  infoText += `🔇 نظام كتم تلقائي\n`;
  infoText += `💬 ردود ذكية\n\n`;
  
  if (isAdmin) {
    infoText += `🎯 أنت مشرف - اكتب "مساعدة" للأوامر`;
  } else {
    infoText += `📝 اكتب "قوانين" للاطلاع على القوانين`;
  }

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: infoText
  });
}

// 📜 عرض قائمة الأعضاء
function showMembersList(event, groupId) {
  const members = groupMembers.get(groupId);
  
  if (!members || members.size === 0) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يوجد أعضاء مسجلين'
    });
    return;
  }

  let membersText = `📋 الأعضاء (${members.size}):\n\n`;
  let count = 0;
  
  for (const [userId, memberData] of members) {
    if (count >= 10) {
      membersText += `\n...و ${members.size - 10} أعضاء آخرين`;
      break;
    }
    const warnings = userWarnings.get(userId) || 0;
    const muteStatus = isUserMuted(userId, groupId) ? ' 🔇' : '';
    const warnStatus = warnings > 0 ? ` ⚠️${warnings}` : ' ✅';
    membersText += `${count + 1}. ${memberData.displayName}${warnStatus}${muteStatus}\n`;
    count++;
  }

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: membersText
  });
}

// 🔇 عرض المكتومين
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

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: mutedText
  });
}

// 🚫 عرض الكلمات الممنوعة
function showBannedWords(event) {
  const wordsText = `🚫 الكلمات الممنوعة:\n\n${Array.from(bannedWords).join('\n')}`;
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: wordsText
  });
}

// 🔍 التحقق من صلاحيات البوت
async function checkBotAdminStatus(event, groupId) {
  try {
    const groupSummary = await client.getGroupSummary(groupId);
    
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🔍 حالة البوت:\n\n✅ متصل بالمجموعة: ${groupSummary.groupName}\n\n💡 لتفعيل الطرد:\n- البوت يجب أن يكون مشرفاً\n- اطلب من مالك المجموعة ترقيته`
    });
    
  } catch (error) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يمكن الوصول لإعدادات المجموعة'
    });
  }
}

// 📋 عرض أوامر المشرفين
function showAdminCommands(event) {
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `👑 *أوامر المشرفين الكاملة:*

🚫 *إدارة الأعضاء:*
!طرد اسم - طرد عضو
!كتم اسم - كتم عضو  
!فك_كتم اسم - فك كتم عضو

📝 *إدارة المحتوى:*
!حظر كلمة - حظر كلمة جديدة

📊 *المعلومات:*
!قائمة - عرض قائمة الأعضاء
!المكتومين - عرض المكتومين
!الكلمات_الممنوعة - عرض الكلمات المحظورة
!تفعيل_الحماية - التحقق من الصلاحيات

❓ *المساعدة:*
!الاوامر - عرض هذه القائمة

📝 *أمثلة:*
!طرد أحمد
!كتم محمد
!حظر سوق
!قائمة`
  });
}

app.get('/', (req, res) => {
  res.send('🤖 بوت الحماية المتكامل شغال!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 بوت الحماية المتكامل شغال على البورت ${PORT}`);
});
