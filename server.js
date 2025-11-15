const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// هذا هو الـ Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('✅ تم استقبال طلب من LINE!');
  console.log('البيانات:', JSON.stringify(req.body, null, 2));
  
  // رد سريع لـ LINE
  res.status(200).json({ status: 'success' });
});

// صفحة رئيسية للاختبار
app.get('/', (req, res) => {
  res.send('🤖 البوت يعمل! استخدم /webhook للـ LINE');
});

// التشغيل على البورت المحدد من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم شغال على البورت ${PORT}`);
});
