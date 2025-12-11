declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    export class PayPalHttpClient {
      constructor(environment: Environment);
      environment: Environment;
      execute(request: PayPalHttpRequest): Promise<PayPalResponse>;
    }

    export class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }

    export class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }

    export type Environment = SandboxEnvironment | LiveEnvironment;

    export class PayPalHttpRequest {
      requestBody(body: unknown): void;
    }
  }

  export namespace orders {
    export class OrdersCreateRequest extends core.PayPalHttpRequest {
      prefer(value: string): void;
    }

    export class OrdersCaptureRequest extends core.PayPalHttpRequest {
      constructor(orderId: string);
    }
  }

  export namespace payments {
    export class CapturesGetRequest extends core.PayPalHttpRequest {
      constructor(captureId: string);
    }

    export class CapturesRefundRequest extends core.PayPalHttpRequest {
      constructor(captureId: string);
    }
  }

  export interface PayPalResponse {
    result?: unknown;
    statusCode?: number;
  }

  export interface OrderResult {
    id?: string;
    status?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
        }>;
      };
    }>;
  }

  export interface CaptureResult {
    id?: string;
    status?: string;
    amount?: {
      value?: string;
      currency_code?: string;
    };
  }

  export interface RefundResult {
    id?: string;
    status?: string;
    amount?: {
      value?: string;
      currency_code?: string;
    };
  }
}
