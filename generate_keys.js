import webpush from 'web-push';
import fs from 'fs';
const vapidKeys = webpush.generateVAPIDKeys();
fs.writeFileSync('keys.txt', `PUBLIC_KEY=${vapidKeys.publicKey}\nPRIVATE_KEY=${vapidKeys.privateKey}`);
