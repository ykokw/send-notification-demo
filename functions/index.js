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
  // .document('messages/{messageId}')
  .document('/topics/{topicId}/messages/{messageId}')
  .onCreate(async (_, context) => {
    const { topicId } = context.params;
    try {
      const usersSnapshot = await db
        .collection('users')
        .where(`topic.${topicId}`, '==', true)
        .get();
      if (usersSnapshot.empty) {
        console.log('empty query result');
        return;
      }
      const usersDoc = usersSnapshot.docs;
      // usersからdeviceTokenを取得
      const tokens = usersDoc.reduce((t, doc) => {
        const u = doc.data();
        if (!u || !u.tokens) return t;
        // アプリ側でtokenのランダム文字列だけをfirestoreに保存するような処理をしているので本来のtokenに復元
        const userTokens = Object.keys(u.tokens).map(t => `ExponentPushToken[${t}]`);
        return t.concat(userTokens);
      }, []);
      // プッシュ通知用のメッセージオブジェクトを作成
      const topicDoc = await db
        .collection('topics')
        .doc(topicId)
        .get();
      const topic = topicDoc.data();
      const messages = [];
      tokens.forEach(pushToken => {
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(`Push token ${pushToken} is not a valid Expo push token`);
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          body: `${topic.name} が更新されました!!`,
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
    } catch (e) {
      console.error(e);
    }
  });
