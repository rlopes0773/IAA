export declare class Presentation {
    private keyManager;
    constructor();
    createPresentation(credentials: any[], challenge?: string, holderDid?: string): Promise<any>;
    private createPresentationData;
    private signPresentation;
    createSelectivePresentation(credentials: any[], selectedAttributes: string[], challenge?: string, holderDid?: string): Promise<any>;
}
export default Presentation;
//# sourceMappingURL=presentation.d.ts.map