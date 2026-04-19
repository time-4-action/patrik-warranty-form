import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cached;
}

export type SendMailInput = {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    bcc: input.bcc,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
}

export async function verifyTransport(): Promise<void> {
  await getTransporter().verify();
}
