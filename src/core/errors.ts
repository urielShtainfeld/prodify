interface ProdifyErrorOptions {
  code?: string;
  exitCode?: number;
}

export class ProdifyError extends Error {
  code: string;
  exitCode: number;

  constructor(message: string, options: ProdifyErrorOptions = {}) {
    super(message);
    this.name = 'ProdifyError';
    this.code = options.code ?? 'PRODIFY_ERROR';
    this.exitCode = options.exitCode ?? 1;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ProdifyError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
