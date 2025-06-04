/// <reference types="node" />
/// <reference types="node" />
export declare function generateRandomBytes(size: number): Buffer;
export declare function hashData(data: string): string;
export declare function signData(privateKey: string, data: string): string;
export declare function verifySignature(publicKey: string, data: string, signature: string): boolean;
//# sourceMappingURL=crypto.d.ts.map