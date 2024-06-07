/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import * as Crypto from 'crypto';
import * as JWT from 'jsonwebtoken';
import { OrNull } from './extension/Extension.full';
import { BitsInByte } from './extension/GeneralConstant';


const PASSWORD_MINIMUM_LENGTH = 8;
const CODE_DEFAULT_LENGTH = 6;

// TODO: Use Crypto for all PKI operation

/**
 * Generate a random password with the specified length and character set.
 * @param targetLength - The length of the password to generate.
 * @param baseCharacterSetList - The list of character sets to use for the password.
 * @returns The generated password.
 */
export function generatePassword(targetLength = PASSWORD_MINIMUM_LENGTH, baseCharacterSetList?: string[]): string {

  const seed: number = Date.now();
  const passwordCharacterList: string[] = [];

  const targetBaseCharacterSetList = baseCharacterSetList ?? [
    '23456789',                   // Numeric: No 0, 1
    'abcdefghjkmnpqrstuvwxyz',    // Lower case: No I, L, O // cspell: disable-line
    'ABCDEFGHJKMNPQRSTUVWXYZ',    // Upper case: NO I, L, O // cspell: disable-line
    ',./;[]`=?:{}|~!@#$%^&*()_+', // Special characters
  ] ;


  for (let i = 0, seedMod = 10; i < targetLength; i++, seedMod = seedMod > seed ? 10 : seedMod * 10) { // eslint-disable-line no-magic-numbers
    const characterSet = targetBaseCharacterSetList[i % targetBaseCharacterSetList.length];
    const character = characterSet[(seed % seedMod) % characterSet.length];
    passwordCharacterList.push(character);
  }

  return passwordCharacterList.shuffle().join('');
}


/**
 * Hash a plain text password using a salt generated from the plain text.
 * @param plainText - The plain text password to hash.
 * @returns The hashed password.
 */
export function password(plainText: string): string {
  const salt = md5(plainText);
  const saltedPlainText = plainText.split('').map((c, index) => c + salt[index % salt.length]).join('') ;
  return sha512(md5(saltedPlainText));
}

/**
 * Calculate the MD5 hash of the input.
 * @param input - The data to hash.
 * @param removePadding - Whether to remove padding characters from the result.
 * @returns The MD5 hash of the input.
 */
export function md5(input: Crypto.BinaryLike, removePadding = false): string {
  const hash = Crypto.createHash('md5').update(input).digest('hex');
  return removePadding ? hash.replace(/=+$/g,'') : hash ;
}

/**
 * Calculate the SHA-512 hash of the input.
 * @param input - The data to hash.
 * @returns The SHA-512 hash of the input.
 */
export function sha512(input: Crypto.BinaryLike): string {
  return Crypto.createHash('sha512').update(input).digest('hex');
}

/**
 * Calculate the HMAC-SHA1 hash of the message using the key.
 * @param key - The key to use for the HMAC calculation.
 * @param message - The message to hash.
 * @param format - The format of the output.
 * @returns The HMAC-SHA1 hash of the message using the key.
 */
export function hmac_sha1(key: string, message: Crypto.BinaryLike, format: Crypto.BinaryToTextEncoding): string {
  return Crypto.createHmac('sha1', key).update(message).digest(format);
}


/**
 * Generates a random code using the specified character set.
 * @param length The length of the code to generate.
 * @param codeBase An array of characters to use as the base for the code. Defaults to 23456789ABCDEFGHJKMNPQRSTUVWXYZ. // cspell: disable-line
 * @returns A randomly generated code.
 */
export function getRandomCode(length = CODE_DEFAULT_LENGTH, codeBase?: string[] ): string {
  const output: string[] = [];

  if ( ! codeBase ) {
    codeBase = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'.split('') ; // cspell: disable-line
  }

  while (output.length < length) {
    output.push(codeBase.shuffle()[0]);
  }
  return output.join('');
}


/**
 * Generate a time-based one-time password (TOTP) using the HMAC-SHA1 algorithm.
 * @param secret - The secret key for the TOTP calculation.
 * @param counter - The counter for the TOTP calculation.
 * @param digits - The number of digits in the TOTP code.
 * @returns The TOTP code.
 */
export function getOTP(secret: string, counter: number, digits = 6): string { // eslint-disable-line no-magic-numbers
  const hexToBytes = (hexString: string): number[] => {
    return (hexString.match(/.{1,2}/g) ?? []).map((hex) => parseInt(hex, 16));
  };

  const hash = hmac_sha1(secret, Buffer.from(counter.toByteArray()), 'hex');
  const hashBytes = hexToBytes(hash);
  const offset = hashBytes[hashBytes.length - 1] & 0xf;  // eslint-disable-line no-magic-numbers

  const codeValue =
    ((hashBytes[offset    ] & 0x7f) << ( BitsInByte * 3 ) ) | // eslint-disable-line no-magic-numbers
    ((hashBytes[offset + 1] & 0xff) << ( BitsInByte * 2 ) ) | // eslint-disable-line no-magic-numbers
    ((hashBytes[offset + 2] & 0xff) << ( BitsInByte * 1 ) ) | // eslint-disable-line no-magic-numbers
    ((hashBytes[offset + 3] & 0xff) << ( BitsInByte * 0 ) ) ; // eslint-disable-line no-magic-numbers

  const code = `${(codeValue % Math.pow(10, digits))}`;       // eslint-disable-line no-magic-numbers
  const otp = code.padLeft ( digits , '0' ) ;

  return otp;
}

/**
 * Generate a UUID string with optional prefix and postfix.
 * @param prefix - The optional prefix for the UUID string.
 * @param postfix - The optional postfix for the UUID string.
 * @returns The UUID string.
 */
export function generateUUID(prefix = '', postfix = ''): string {
  return `${prefix}${Crypto.randomUUID()}${postfix}`;
}

/* *********************
 *  JWT
 * ********************* */

/**
 * Decode a JSON Web Token (JWT) string into a JWT payload object.
 * @param jwtString - The JWT string to decode.
 * @returns The decoded JWT payload object, or null if the input is not a valid JWT string.
 */
export function decodeJWT(jwtString: string): OrNull<JWT.JwtPayload> {
  return JWT.decode(jwtString) as OrNull<JWT.JwtPayload>;
}

/**
 * Generate a JSON Web Token (JWT) string from a payload object using a secret or private key.
 * @param payload - The payload object to encode as a JWT.
 * @param secretOrPrivateKey - The secret or private key to use for encoding the JWT.
 * @param options - The optional sign options for encoding the JWT.
 * @returns The encoded JWT string.
 */
export function signJWT( payload: string | object | Buffer, secretOrPrivateKey: JWT.Secret, options?: JWT.SignOptions ): string {
  return JWT.sign(payload, secretOrPrivateKey, options);
}


/**
 * Encrypt a plain text message using a public key and AES-256-CBC algorithm.
 * @param certPEM - The certification (PEM) to use for encrypting the message.
 * @param plainText - The plain text message to encrypt.
 * @returns The encrypted message in Base64 format, or null if the encryption fails.
 */
export function encryptByPublicKey ( certPEM: string , plainText: string ): string {
  const publicKey = new Crypto.X509Certificate(certPEM).publicKey ;
  const cipherBuffer = Crypto.publicEncrypt ( publicKey , Buffer.from ( plainText ) ) ;
  return cipherBuffer.toString('base64') ;
}

/**
 * Decrypts privateKeyPEM using passPhrase and returns the decrypted private key in PEM format.
 * @param privateKeyPEM - The private key in PEM format.
 * @param passPhrase - The passphrase for the private key.
 * @returns The decrypted private key in PEM format.
 */
export function decryptPrivateKey ( privateKeyPEM: string , passPhrase: string ): string {
  const decryptedPrivateKey = Crypto.createPrivateKey ( {key: privateKeyPEM, format: 'pem', type: 'pkcs8', passphrase: passPhrase} ) ;
  const decryptByPrivateKeyPEM = decryptedPrivateKey.export ( {type: 'pkcs8', format: 'pem'} ) as string ;
  return decryptByPrivateKeyPEM ;
}


/**
 * Verify a signature using a public key certificate and a message.
 * @param publicKeyCert - The public key certificate used for verifying the signature.
 * @param message - The original message used for generating the signature.
 * @param signature64 - The signature to verify, in Base64 format or as a Uint8Array.
 * @param options - The optional verification options.
 * @returns Whether the signature is verified successfully.
 */
export function verifySignature ( publicKeyCert: string, message: string , signature64: string , options = {algorithm: 'RSA-SHA256'} ): boolean {
  const verify = Crypto.createVerify( options.algorithm ).update(message) ;
  return verify.verify(new Crypto.X509Certificate(publicKeyCert).publicKey, signature64, 'base64');
}



/**
 * Decrypts a cipher string using the provided private key and passphrase
 * @param privateKey The private key in PEM format
 * @param passPhrase The passphrase for the private key
 * @param cipher64 The cipher string to decrypt, base64 encoded
 * @param decryptCallback A callback function to handle the decrypted data, base64 encoded
 */
export function decryptByPrivateKey(privateKeyPEM: string, passPhrase: string, cipher64: string): string {
  const plainTextBuffer = Crypto.privateDecrypt ( { key: privateKeyPEM , passphrase: passPhrase } , cipher64.decodeBase64() )
  return plainTextBuffer.toString('base64');
}
