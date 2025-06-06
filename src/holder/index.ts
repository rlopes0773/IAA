import Presentation from './presentation';

export class Holder {
    private presentation: Presentation;

    constructor() {
        this.presentation = new Presentation();
    }

    async createPresentation(credential: any, challenge?: string) {
        console.log('Holder creating presentation...');
        return await this.presentation.createPresentation(credential, challenge);
    }
}

export default Holder;