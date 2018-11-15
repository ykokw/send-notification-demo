const { Expo } = require("expo-server-sdk");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const expo = new Expo();

exports.sendNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async () => {
    console.log("onCreate");
    const settings = { timestampsInSnapshots: true };
    const db = admin.firestore();
    db.settings(settings);
    const query = db.collection("tokens").where("token", ">", "");
    const snapshot = await query.get();
    const tokens = [];
    snapshot.forEach(doc => tokens.push(doc.get("token")));
    console.log(JSON.stringify(tokens));
    const messages = [];
    tokens.forEach(pushToken => {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
      }

      // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
      messages.push({
        to: pushToken,
        sound: "default",
        body: "This is a test notification",
        data: { withSome: "data" }
      });
    });
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
          // NOTE: If a ticket contains an error code in ticket.details.error, you
          // must handle it appropriately. The error codes are listed in the Expo
          // documentation:
          // https://docs.expo.io/versions/latest/guides/push-notifications#response-format
        } catch (error) {
          console.error(error);
        }
      }
    })();
  });
