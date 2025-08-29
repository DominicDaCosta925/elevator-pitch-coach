declare module 'pdf-text-extract' {
  function extract(filePath: string, options: any, callback: (error: any, pages: string[]) => void): void;
  export = extract;
}
