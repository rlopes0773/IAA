"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Verifier = void 0;
const verification_1 = require("./verification");
class Verifier {
    constructor(revocationRegistry) {
        this.verification = new verification_1.Verification(revocationRegistry);
    }
    verify(presentation, credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Verifier starting verification...');
            return yield this.verification.verifyPresentation(presentation, credentials);
        });
    }
}
exports.Verifier = Verifier;
exports.default = Verifier;
