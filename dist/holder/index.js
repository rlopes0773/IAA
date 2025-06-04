"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Holder = void 0;
const presentation_1 = __importDefault(require("./presentation"));
class Holder {
    constructor() {
        this.presentation = new presentation_1.default();
    }
    async createPresentation(credentials, challenge, holderDid) {
        console.log('Holder creating presentation...');
        return await this.presentation.createPresentation(credentials, challenge, holderDid);
    }
}
exports.Holder = Holder;
exports.default = Holder;
//# sourceMappingURL=index.js.map