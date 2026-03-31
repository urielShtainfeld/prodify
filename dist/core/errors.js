export class ProdifyError extends Error {
    code;
    exitCode;
    constructor(message, options = {}) {
        super(message);
        this.name = 'ProdifyError';
        this.code = options.code ?? 'PRODIFY_ERROR';
        this.exitCode = options.exitCode ?? 1;
    }
}
export function toErrorMessage(error) {
    if (error instanceof ProdifyError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
