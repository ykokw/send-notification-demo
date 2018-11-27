const { Expo } = require('expo-server-sdk');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Expo のインスタンスを用意
const expo = new Expo();

// Firestore のインスタンスを用意
admin.initializeApp();
const settings = { timestampsInSnapshots: true };
const db = admin.firestore();
db.settings(settings);

exports.sendNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async () => {
    // デバイストークンを Firestore から全検索
    const query = db.collection('tokens').where('token', '>', '');
    const snapshot = await query.get();
    const tokens = snapshot.docs.map(doc => doc.get('token'));

    // プッシュ通知用のメッセージオブジェクトを作成
    const messages = [];
    tokens.forEach(pushToken => {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        body: 'This is a test notification',
        data: { withSome: 'data' },
      });
    });
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    (async () => {
      // Expo Push API をリクエスト
      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error(error);
        }
      }
    })();
  });
