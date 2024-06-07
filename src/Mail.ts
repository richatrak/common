/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */

import * as NodeMailer from 'nodemailer';
import * as Library from './Library';
import { AnyType, FreeRecords, OneOrMany, OneOrManyOrNull, OrNull, TypedRecords } from './extension/Extension.full';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

const SMTP_TLS_PORT = 587;

export const EMAIL_ADDRESS_SYMBOL = '@';


export type SimpleMailOptions = {
  from?: string;
  to: OneOrMany<string>;
  bcc?: OneOrManyOrNull<string>
  subject: string;
  htmlBody: string;
  headers?: OrNull<TypedRecords<string>>;


  attachments?: OneOrManyOrNull<AnyType>;
}



/**
 * Validates an email address using the specified restriction list.
 * @param emailAddress The email address to validate.
 * @returns True if the email address is valid, otherwise false.
 */
export function isValidEmailAddress(emailAddress: OrNull<string>, restrictionSetting = (process.env['Common.mailServerRestriction'] as string)?.trim()): boolean {

  // Null is always invalid
  if (null === emailAddress) {
    return false;
  }

  // No Restriction
  if ( ! restrictionSetting ) { return true ; }

  const restrictionList = restrictionSetting.toLowerCase().split(',').map((probe) => probe.trim());
  const email = emailAddress.toLowerCase().trim()
  const [ , domain] = email.explode ( EMAIL_ADDRESS_SYMBOL , 2 ); // eslint-disable-line no-magic-numbers

  for ( const restriction of restrictionList){
    if ( restriction.includes(EMAIL_ADDRESS_SYMBOL) ) { // for whole email address
      if ( restriction === email ) { return true ;}
    }
    else {
      if ( domain.endsWith ( restriction ) ) { return true ;}
    }
  }

  return false ;
}



export function sendMail ( options: SimpleMailOptions, callback: (err: OrNull<Error>, info: SMTPTransport.SentMessageInfo) => void ) {

  const headers = options.headers ?? {} ;
  headers.From = headers.From ?? headers.from ?? options.from ;

  const toList = ( Array.isArray ( options.to ) ? options.to : [ options.to ] ).filter ( email => isValidEmailAddress ( email ) ) ;
  const bccList = options.bcc ? ( Array.isArray ( options.bcc ) ? options.bcc : [ options.bcc ] ).filter ( email => isValidEmailAddress ( email ) ) : [] ;

  const mailOptions: NodeMailer.SendMailOptions = {
    from: options.from,
    to: getEmailRecipients(toList),
    subject: options.subject,
    headers: headers,
    html: options.htmlBody,
    bcc: getEmailRecipients(bccList),
    attachments: options.attachments,
  } ;

  sendMailAdvanced(mailOptions, (err, info) => {
    callback(err, info);
  });
}

/**
 * Sends an email message using advanced options.
 * @param messageOptions The email message options.
 * @param callback The callback function to execute when the email is sent.
 */
export function sendMailAdvanced( messageOptions: NodeMailer.SendMailOptions, callback: OrNull<(err: OrNull<Error>, info: SMTPTransport.SentMessageInfo) => void> = null) {


  const transporterOptions: FreeRecords = {
    host: process.env['Common.mailServerHost'],
    port: +(process.env['Common.mailServerPort'] ?? SMTP_TLS_PORT),
    secure: JSON.parse(process.env['Common.mailServerSecure'] ?? '{}'),
    auth: { user: process.env['Secret.Mail.User'] ?? '', pass: process.env['Secret.Mail.Password'] ?? '' },
    tls: { rejectUnauthorized: false },
  } ;


  if (! transporterOptions.auth.user) {
    delete transporterOptions.auth;
  }

  const transporter = NodeMailer.createTransport(transporterOptions);
  transporter.sendMail(messageOptions, (err, info) => {
    if (callback) {
      callback(err, info);
    }
  });
}

/**
 * Returns a string representation of the email recipients.
 *
 * @param recipients - An email recipient, an array of email recipients, or null.
 * @returns A string representation of the email recipients, or an empty string if recipients is null.
 */
function getEmailRecipients(recipients: OneOrManyOrNull<string>): string {
  if (recipients === null) {
    return '';
  } else if (Array.isArray(recipients)) {
    return recipients.join(',');
  } else {
    return recipients;
  }
}


/**
 * A type representing the content of an email, consisting of a subject and a body.
 */
export type MailContent = { subject: string; body: string };


/**
 * Replaces patterns in the subject and body of an email template with specified values.
 *
 * @param template - An email template consisting of a subject and a body.
 * @param replacePatternDictionary - An optional dictionary of patterns to replace in the email template.
 * @returns An email content object with the updated subject and body.
 */
export function applyMailTemplate( template: MailContent, replacePatternDictionary: OrNull<TypedRecords<string>>): MailContent {
  const mailContent: MailContent = {
    subject: template.subject.dictionaryReplace(replacePatternDictionary),
    body:    template.body.dictionaryReplace(replacePatternDictionary),
  };
  return mailContent;
}

/**
 * Reads an email template from a file and replaces patterns in the template with specified values.
 *
 * @param templatePath - The path to the file containing the email template.
 * @param replacePatternDictionary - An optional dictionary of patterns to replace in the email template.
 * @returns An email content object with the updated subject and body.
 */
export function getMailContentByTemplate(templatePath: string,replacePatternDictionary: OrNull<TypedRecords<string>> = null): MailContent {
  const templateData: MailContent = JSON.parse((Library.File.readFile(templatePath) ?? '').toString());
  return applyMailTemplate(templateData, replacePatternDictionary);
}
