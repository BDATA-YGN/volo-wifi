export class CustomException extends Error {
  public status: number;
  public code: string;
  public message: string;
  public details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.message = message;
    this.details = details;
    // Avoid logging exceptions at construction time; logging should happen at the boundary
    // (e.g. ErrorMiddleware) to prevent leaking sensitive info and duplicate logs.
  }
}

export interface InvalidPayloadDetail {
  location: 'request.query' | 'request.body' | 'request.header' | 'request.params';
  field: string;
  message: string;
}

export class InvalidPayloadException extends CustomException {
  public details: InvalidPayloadDetail[];
  constructor(message: string, details?: InvalidPayloadDetail[]) {
    super(400, 'INVALID_PAYLOAD', message);
    this.details = details;
  }
}
