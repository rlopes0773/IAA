import Presentation from './presentation';

export class Holder {
    private presentation: Presentation;

    constructor() {
        this.presentation = new Presentation();
    }

    async createPresentation(credentials: any[], challenge?: string, holderDid?: string) {
        console.log('Holder creating presentation...');
        return await this.presentation.createPresentation(credentials, challenge, holderDid);
    }
}

export default Holder;