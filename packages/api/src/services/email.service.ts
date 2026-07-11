import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  ...(env.SMTP_PASS
    ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
    : {}),
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

export async function sendReservationSubmitted(to: string, userName: string, motif: string) {
  await sendEmail({
    to,
    subject: 'Nouvelle demande de reservation',
    html: `
      <h2>Nouvelle demande de reservation</h2>
      <p><strong>${userName}</strong> a soumis une demande de reservation.</p>
      <p><strong>Motif :</strong> ${motif}</p>
      <p>Connectez-vous pour la valider ou la refuser.</p>
    `,
  });
}

export async function sendReservationApproved(to: string, motif: string) {
  await sendEmail({
    to,
    subject: 'Reservation validee',
    html: `
      <h2>Votre reservation a ete validee</h2>
      <p>Votre demande pour <strong>${motif}</strong> a ete approuvee.</p>
      <p>Connectez-vous pour consulter les details.</p>
    `,
  });
}

export async function sendReservationRefused(to: string, motif: string, reason?: string) {
  await sendEmail({
    to,
    subject: 'Reservation refusee',
    html: `
      <h2>Votre reservation a ete refusee</h2>
      <p>Votre demande pour <strong>${motif}</strong> n'a pas ete approuvee.</p>
      ${reason ? `<p><strong>Motif du refus :</strong> ${reason}</p>` : ''}
      <p>Contactez un administrateur pour plus d'informations.</p>
    `,
  });
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: 'Reinitialisation de votre mot de passe',
    html: `
      <h2>Reinitialisation de mot de passe</h2>
      <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
      <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `,
  });
}

export async function sendAccountCreated(to: string, prenom: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: 'Bienvenue sur Fonda Resa',
    html: `
      <h2>Bienvenue, ${prenom} !</h2>
      <p>Un compte a ete cree pour vous sur Fonda Resa.</p>
      <p><strong>Email :</strong> ${to}</p>
      <p><strong>Mot de passe temporaire :</strong> ${tempPassword}</p>
      <p>Connectez-vous et changez votre mot de passe des que possible.</p>
      <p><a href="${env.FRONTEND_URL}/login">Se connecter</a></p>
    `,
  });
}

export async function sendPasswordResetByAdmin(to: string, prenom: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: 'Votre mot de passe a ete reinitialise',
    html: `
      <h2>Bonjour, ${prenom}</h2>
      <p>Un administrateur a reinitialise votre mot de passe sur Fonda Resa.</p>
      <p><strong>Nouveau mot de passe temporaire :</strong> ${tempPassword}</p>
      <p>Connectez-vous et changez votre mot de passe des que possible.</p>
      <p><a href="${env.FRONTEND_URL}/login">Se connecter</a></p>
    `,
  });
}
