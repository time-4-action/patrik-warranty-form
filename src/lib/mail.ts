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

// Non-production envs set MAIL_REDIRECT_TO so every email (customer + admin)
// goes to that one inbox instead of real customers/admins. The original
// recipients are kept in the subject so it's clear who would have got it.
function applyRedirect(input: SendMailInput): SendMailInput {
  const redirect = process.env.MAIL_REDIRECT_TO;
  if (!redirect) return input;
  const original = [input.to, input.bcc].flat().filter(Boolean).join(", ");
  return {
    ...input,
    to: redirect,
    bcc: undefined,
    subject: `[DEV → ${original}] ${input.subject}`,
  };
}

export async function sendMail(mail: SendMailInput): Promise<void> {
  const input = applyRedirect(mail);
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
