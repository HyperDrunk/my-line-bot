const express = require("express");
const line = require("@line/bot-sdk");
const app = express();

const config = {
  channelAccessToken: 'bGSRA/2mmH3ls9vhbhQ/fzCd0eS/9zXi67tnyTzdnEPG9eFfOz/dmnru4kCGoAqa1l1SKH3Pa56h0O40pQivTBiOVfTiIqYKc7fYL4cTMcuislx0OGqYFFmVuu4N4TfP6yK835erCoffxOZrQrDr4QdB04t89/1O/w1cDnyilFU=',
  channelSecret: '73dcd76ba4de9810f67b6fffadcf8ef5'
};

const client = new line.Client(config);

// 🔧 إعدادات البوت الكاملة
const securitySettings = {
  admins: ['U1f51a7685b725c6769f662c16ef3069a'],
  bannedWords: ['سوق', 'بيع', 'شراء', 'إعلان', 'سبام', 'spam', 'منتج', 'عرض'],
  autoKick: true,
  maxWarnings: 3,
  rules: `📋 *قوانين المجموعة*:
  
1. ✅ الالتزام بالأدب والاحترام
2. ❌ ممنوع الإعلان أو البيع
3. ❌ ممنوع المحتوى غير اللائق
4. ❌ ممنوع السبام
5. ⚠️ 3 مخالفات = طرد تلقائي

🎯 المجموعة للتواصل الهادف والمناقشات البناءة`
};

// تخزين البيانات
const userWarnings = new Map();
const mutedUsers = new Map();
const groupMembers = new Map();
const autoReplies = new Map();

// 🔥 إعداد الردود التلقائية
autoReplies.set('اتشو', 'يرحمك الله يا قلبي 🤲');
autoReplies.set('عطس', 'يرحمك الله 🙏');
autoReplies.set('الحمدلله', 'الله يبارك فيك 🌟');
autoReplies.set('صباح الخير', 'صباح النور 🌞');
autoReplies.set('مساء الخير', 'مساء الأنوار 🌙');
autoReplies.set('اهلا', 'أهلاً وسهلاً 🌹');
autoReplies.set('مرحبا', 'مرحبا بك 😊');

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
    console.log('⚠️ لا يمكن الحصول على بروفايل العضو');
  }
}

async function handleSmartMessage(event) {
  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  const replyToken = event.replyToken;
  const isAdmin = securitySettings.admins.includes(userId);

  // 🔥 الردود التلقائية أولاً
  for (const [keyword, response] of autoReplies) {
    if (userMessage.includes(keyword)) {
      client.replyMessage(replyToken, {
        type: 'text',
        text: response
      });
      break;
    }
  }

  // 🔍 إذا كان المستخدم مكتوماً
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
      handleBanCommand(event, userMessage);
      return;
    }
    
    if (userMessage.startsWith('!فك_حظر ')) {
      handleUnbanCommand(event, userMessage);
      return;
    }
    
    if (userMessage === '!القوانين') {
      showRules(event);
      return;
    }
    
    if (userMessage === '!قائمة_الاعضاء') {
      showMembersList(event, groupId);
      return;
    }
    
    if (userMessage === '!قائمة_المكتومين') {
      showMutedUsers(event, groupId);
      return;
    }
    
    if (userMessage === '!قائمة_المحظورين') {
      showBannedWords(event);
      return;
    }
    
    if (userMessage === '!تفعيل_الحماية') {
      checkBotAdminStatus(event, groupId);
      return;
    }
    
    if (userMessage === '!الاوامر') {
      showAllCommands(event, isAdmin);
      return;
    }
    
    if (userMessage.startsWith('!اضافة_رد ')) {
      handleAddAutoReply(event, userMessage);
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

  // 📝 أوامر عامة للجميع
  if (userMessage === '!القوانين') {
    showRules(event);
    return;
  }
  
  if (userMessage === '!الاوامر') {
    showUserCommands(event);
    return;
  }
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
      text: `❌ لم أجد "${targetName}"`
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

// 🚫 حظر كلمة
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

// ✅ فك حظر كلمة
function handleUnbanCommand(event, userMessage) {
  const wordMatch = userMessage.match(/!فك_حظر\s+(\S+)/);
  
  if (!wordMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !فك_حظر كلمة'
    });
    return;
  }

  const unbannedWord = wordMatch[1];
  const index = securitySettings.bannedWords.indexOf(unbannedWord);
  if (index > -1) {
    securitySettings.bannedWords.splice(index, 1);
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ تم فك حظر الكلمة: "${unbannedWord}"`
    });
  } else {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ "${unbannedWord}" غير محظورة`
    });
  }
}

// ➕ إضافة رد تلقائي
function handleAddAutoReply(event, userMessage) {
  const replyMatch = userMessage.match(/!اضافة_رد\s+(\S+)\s+(.+)/);
  
  if (!replyMatch) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ استخدم: !اضافة_رد كلمة الرد'
    });
    return;
  }

  const keyword = replyMatch[1];
  const response = replyMatch[2];
  
  autoReplies.set(keyword, response);
  
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ تم إضافة رد تلقائي:\n"${keyword}" → "${response}"`
  });
}

// 📋 عرض القوانين
function showRules(event) {
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: securitySettings.rules
  });
}

// 👥 عرض قائمة الأعضاء
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
    if (count >= 10) break;
    const warnings = userWarnings.get(userId) || 0;
    const muteStatus = isUserMuted(userId, groupId) ? ' 🔇' : '';
    const warnStatus = warnings > 0 ? ` ⚠️${warnings}` : '';
    membersText += `${count + 1}. ${memberData.displayName}${muteStatus}${warnStatus}\n`;
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

// 🚫 عرض الكلمات المحظورة
function showBannedWords(event) {
  client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🚫 الكلمات المحظورة:\n${securitySettings.bannedWords.join(', ')}`
  });
}

// 🛡️ تفعيل الحماية
async function checkBotAdminStatus(event, groupId) {
  try {
    await client.getGroupSummary(groupId);
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: `✅ البوت متصل بالمجموعة\n\n💡 للطرد يجب أن يكون البوت مشرفاً`
    });
  } catch (error) {
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ لا يمكن الوصول للمجموعة'
    });
  }
}

// 📜 عرض جميع الأوامر
function showAllCommands(event, isAdmin) {
  let commandsText = `🎯 *أوامر البوت:*\n\n`;
  
  commandsText += `📋 *أوامر عامة:*\n`;
  commandsText += `!القوانين - عرض قوانين المجموعة\n`;
  commandsText += `!الاوامر - عرض هذه القائمة\n\n`;
  
  if (isAdmin) {
    commandsText += `👑 *أوامر المشرفين:*\n`;
    commandsText += `!طرد اسم - طرد عضو\n`;
    commandsText += `!كتم اسم - كتم عضو\n`;
    commandsText += `!فك_كتم اسم - فك كتم عضو\n`;
    commandsText += `!حظر كلمة - حظر كلمة\n`;
    commandsText += `!فك_حظر كلمة - فك حظر كلمة\n`;
    commandsText += `!اضافة_رد كلمة رد - إضافة رد تلقائي\n`;
    commandsText += `!قائمة_الاعضاء - عرض الأعضاء\n`;
    commandsText += `!قائمة_المكتومين - عرض المكتومين\n`;
    commandsText += `!قائمة_المحظورين - عرض الكلمات المحظورة\n`;
    commandsText += `!تفعيل_الحماية - التحقق من الصلاحيات\n\n`;
  }
  
  commandsText += `🤖 *ردود تلقائية:*\n`;
  commandsText += `اتشو, عطس, الحمدلله, مرحبا, صباح الخير, مساء الخير`;

  client.replyMessage(event.replyToken, {
    type: 'text',
    text: commandsText
  });
}

// 📝 أوامر المستخدمين العاديين
function showUserCommands(event) {
  const commandsText = `🎯 *أوامر متاحة للجميع:*\n\n
