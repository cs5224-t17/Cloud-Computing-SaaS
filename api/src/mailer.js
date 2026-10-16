import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import { config } from './config.js';

let send;

if (config.mailDriver === 'ses') {
  const ses = new SESv2Client({ region: config.awsRegion });
  send = async ({ to, subject, text }) => {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: config.mailFrom,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    }));
  };
} else if (config.mailDriver === 'smtp') {
  const transport = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });
  send = async ({ to, subject, text }) => { await transport.sendMail({ from: config.mailFrom, to, subject, text }); };
} else {
  send = async ({ to, subject, text }) => { console.log(`[mail:log] to=${to} subject="${subject}"\n${text}`); };
}

export async function sendMail(msg) {
  try {
    await send(msg);
    return true;
  } catch (e) {
    // SES sandbox rejects unverified recipients; don't fail the request over it.
    console.error(`[mail] failed to=${msg.to}: ${e.name}: ${e.message}`);
    return false;
  }
}
