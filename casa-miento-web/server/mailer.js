import nodemailer from 'nodemailer';
import { requiredEnv, requiredIntEnv } from './config.js';

export const buildTransport = () => {
  const emailHost = requiredEnv('EMAIL_HOST');
  const emailPort = requiredIntEnv('EMAIL_PORT');
  const emailUser = requiredEnv('EMAIL_USER');
  const emailPass = requiredEnv('EMAIL_PASS');

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

export const fromAddress = () => requiredEnv('EMAIL_FROM');
