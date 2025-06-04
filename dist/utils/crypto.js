"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignature = exports.signData = exports.hashData = exports.generateRandomBytes = void 0;
const crypto_1 = require("crypto");
function generateRandomBytes(size) {
    return (0, crypto_1.randomBytes)(size);
}
exports.generateRandomBytes = generateRandomBytes;
function hashData(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
exports.hashData = hashData;
function signData(privateKey, data) {
    const sign = (0, crypto_1.createSign)('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
}
exports.signData = signData;
function verifySignature(publicKey, data, signature) {
    const verify = (0, crypto_1.createVerify)('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
}
exports.verifySignature = verifySignature;
