import { createHash, randomBytes, createSign, createVerify } from 'crypto';

export function generateRandomBytes(size: number): Buffer {
    return randomBytes(size);
}

export function hashData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export function signData(privateKey: string, data: string): string {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
}

export function verifySignature(publicKey: string, data: string, signature: string): boolean {
    const verify = createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
}