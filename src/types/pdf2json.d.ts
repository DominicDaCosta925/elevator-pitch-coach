declare module 'pdf2json' {
  class PDFParser {
    constructor();
    on(event: string, callback: (data: any) => void): void;
    parseBuffer(buffer: Buffer): void;
  }
  export = PDFParser;
}
