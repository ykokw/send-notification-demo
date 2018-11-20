const { Expo } = require('expo-server-sdk');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const expo = new Expo();
// Firestoreのインスタンスを用意
const settings = { timestampsInSnapshots: true };
const db = admin.firestore();
db.settings(settings);

exports.sendNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async () => {
    // デバイストークンをFirestoreから全検索
    const query = db.collection('tokens').where('token', '>', '');
    const snapshot = await query.get();
    const tokens = snapshot.docs.map(doc => doc.get('token'));

    // プッシュ通知用のメッセージオブジェクトを作成
    const messages = [];
    tokens.forEach(pushToken => {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
      }

      // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
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
      // Expo Push APIをリクエスト
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
