import nacl from "tweetnacl";
import { v4 as uuidv4 } from "uuid";

export interface RobinhoodConfig {
  privateKeyBase64: string;
  publicKeyBase64: string;
  apiKey: string;
}

export interface MarketOrderConfig {
  asset_quantity: number;
}

export interface LimitOrderConfig {
  quote_amount?: number;
  asset_quantity?: number;
  limit_price: number;
  time_in_force: "gtc";
}

export interface StopLossOrderConfig {
  quote_amount?: number;
  asset_quantity?: number;
  stop_price: number;
  time_in_force: "gtc";
}

export interface StopLimitOrderConfig {
  quote_amount?: number;
  asset_quantity?: number;
  limit_price: number;
  stop_price: number;
  time_in_force: "gtc";
}

export interface OrderPayload {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop_limit" | "stop_loss";
  market_order_config?: MarketOrderConfig;
  limit_order_config?: LimitOrderConfig;
  stop_loss_order_config?: StopLossOrderConfig;
  stop_limit_order_config?: StopLimitOrderConfig;
}

export interface TradingPair {
  symbol: string;
  status: string;
  min_order_size: number;
  max_order_size: number;
}

export interface OrderFilters {
  created_at_start?: string;
  created_at_end?: string;
  symbol?: string;
  id?: string;
  side?: "buy" | "sell";
  state?: "open" | "canceled" | "partially_filled" | "filled" | "failed";
  type?: "limit" | "market" | "stop_limit" | "stop_loss";
  updated_at_start?: string;
  updated_at_end?: string;
}
export interface OrderExecution {
  effective_price: string;
  quantity: string;
  timestamp: string;
}

export interface OrderResponse {
  id: string;
  account_number: string;
  symbol: string;
  client_order_id: string;
  side: "buy" | "sell";
  executions: OrderExecution[];
  type: "limit" | "market" | "stop_limit" | "stop_loss";
  state: "open" | "canceled" | "partially_filled" | "filled" | "failed";
  average_price: number | null;
  filled_asset_quantity: number;
  created_at: string;
  updated_at: string;
  market_order_config?: MarketOrderConfig;
  limit_order_config?: LimitOrderConfig;
  stop_loss_order_config?: StopLossOrderConfig;
  stop_limit_order_config?: StopLimitOrderConfig;
}

export interface OrdersResponse {
  next: string | null;
  previous: string | null;
  results: OrderResponse[];
}

export interface CancelOrderResponse {
  success: string;
}

// Market Data
export interface BidAskPrice {
  symbol: string;
  price: number;
  bid_inclusive_of_sell_spread: number;
  sell_spread: number;
  ask_inclusive_of_buy_spread: number;
  buy_spread: number;
  timestamp: string;
}

export interface BidAskResponse {
  results: BidAskPrice[];
}

export interface EstimatedPrice {
  symbol: string;
  side: "bid" | "ask";
  price: number;
  quantity: number;
  bid_inclusive_of_sell_spread: number;
  sell_spread: number;
  ask_inclusive_of_buy_spread: number;
  buy_spread: number;
  timestamp: string;
}

export interface EstimatedPriceResponse {
  results: EstimatedPrice[];
}

export interface TradingPairResponse {
  asset_code: string;
  quote_code: string;
  quote_increment: string;
  asset_increment: string;
  max_order_size: string;
  min_order_size: string;
  status: "tradable" | "untradable" | "sellonly";
  symbol: string;
}

export interface TradingPairsResponse {
  next: string | null;
  previous: string | null;
  results: TradingPairResponse[];
}

export interface ErrorResponse {
  type: "validation_error" | "client_error" | "server_error";
  errors: {
    detail: string;
    attr: string | null;
  }[];
}

export interface AccountResponse {
  account_number: string;
  status: "active" | "deactivated" | "sell_only";
  buying_power: string;
  buying_power_currency: string;
}

export interface Holding {
  account_number: string;
  asset_code: string;
  total_quantity: number;
  quantity_available_for_trading: number;
}

export interface HoldingsResponse {
  next: string | null;
  previous: string | null;
  results: Holding[];
}

export class RobinhoodCrypto {
  private config: RobinhoodConfig;
  private baseUrl = "https://trading.robinhood.com";

  constructor(config: RobinhoodConfig) {
    this.config = config;
  }
  private async signRequest(path: string, method: string, body: string = "") {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Convert base64 keys to Uint8Array
    const privateKeyBytes = new Uint8Array(
      Buffer.from(this.config.privateKeyBase64, "base64")
    );
    const publicKeyBytes = Buffer.from(this.config.publicKeyBase64, "base64");

    // Create signing key pair
    const signingKey = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);

    // Create message to sign
    const message = `${this.config.apiKey}${timestamp}${path}${method}${body}`;

    // Sign message
    const signature = nacl.sign.detached(
      new Uint8Array(Buffer.from(message)),
      signingKey.secretKey
    );

    // Convert signature to base64
    const signatureBase64 = Buffer.from(signature).toString("base64");

    return {
      timestamp,
      signatureBase64,
    };
  }

  private async makeRequest(path: string, method: string, body: string = "") {
    const { timestamp, signatureBase64 } = await this.signRequest(
      path,
      method,
      body
    );

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "x-timestamp": timestamp,
      "x-signature": signatureBase64,
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      requestOptions.body = body;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, requestOptions);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Request failed with the following details:");
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error(`URL: ${this.baseUrl}${path}`);
        console.error(`Method: ${method}`);
        console.error("Headers:", headers);
        if (body) console.error("Request Body:", body);
        console.error("Response Body:", errorBody);
        throw new Error(
          `HTTP request failed - Status: ${response.status}, Body: ${errorBody}`
        );
      }

      return response.json();
    } catch (error) {
      console.error("Failed to execute request:");
      console.error(`URL: ${this.baseUrl}${path}`);
      console.error(`Method: ${method}`);
      console.error("Headers:", headers);
      if (body) console.error("Request Body:", body);
      console.error("Error details:", error);
      throw error;
    }
  }

  async getBestBidAsk(
    symbols: string[] = ["BTC-USD"]
  ): Promise<BidAskResponse> {
    const queryString = symbols.map((s) => `symbol=${s}`).join("&");
    const response = await this.makeRequest(
      `/api/v1/crypto/marketdata/best_bid_ask/?${queryString}`,
      "GET"
    );
    return {
      results: response.results.map((result: any) => ({
        ...result,
        price: parseFloat(result.price),
        bid_inclusive_of_sell_spread: parseFloat(
          result.bid_inclusive_of_sell_spread
        ),
        sell_spread: parseFloat(result.sell_spread),
        ask_inclusive_of_buy_spread: parseFloat(
          result.ask_inclusive_of_buy_spread
        ),
        buy_spread: parseFloat(result.buy_spread),
      })),
    };
  }

  async getEstimatedPrice(
    symbol: string,
    side: "bid" | "ask" | "both",
    quantities: number[]
  ): Promise<EstimatedPriceResponse> {
    const formattedQuantities = quantities.map((q) => Number(q.toFixed(8)));
    const queryString = `symbol=${symbol}&side=${side}&quantity=${formattedQuantities.join(
      ","
    )}`;
    const response = await this.makeRequest(
      `/api/v1/crypto/marketdata/estimated_price/?${queryString}`,
      "GET"
    );
    return {
      results: response.results.map((result: any) => ({
        ...result,
        price: parseFloat(result.price),
        quantity: parseFloat(result.quantity),
        bid_inclusive_of_sell_spread: parseFloat(
          result.bid_inclusive_of_sell_spread
        ),
        sell_spread: parseFloat(result.sell_spread),
        ask_inclusive_of_buy_spread: parseFloat(
          result.ask_inclusive_of_buy_spread
        ),
        buy_spread: parseFloat(result.buy_spread),
      })),
    };
  }

  // Trading Pairs
  async getTradingPairs(
    symbols: string[] = ["BTC-USD"],
    limit?: number,
    cursor?: string
  ): Promise<TradingPairsResponse> {
    let queryString = symbols.map((s) => `symbol=${s}`).join("&");
    if (limit) queryString += `&limit=${limit}`;
    if (cursor) queryString += `&cursor=${cursor}`;
    return this.makeRequest(
      `/api/v1/crypto/trading/trading_pairs/?${queryString}`,
      "GET"
    );
  }

  // Orders
  async placeOrder(order: OrderPayload): Promise<OrderResponse> {
    // Ensure quantities have max 8 decimal places
    let payload = {
      ...order,
      client_order_id: uuidv4(),
    };

    // BTC-USD has 8 decimal places
    // ETH-USD has 6 decimal places
    // DOGE-USD has 2 decimal places

    let precision = 5;
    if (payload.symbol === "BTC-USD") precision = 8;
    else if (payload.symbol === "ETH-USD") precision = 6;
    else if (payload.symbol === "DOGE-USD") precision = 2;

    const multiplier = Math.pow(10, precision);

    if (payload.market_order_config?.asset_quantity) {
      payload.market_order_config.asset_quantity =
        Math.floor(payload.market_order_config.asset_quantity * multiplier) / multiplier;
    }
    if (payload.limit_order_config?.asset_quantity) {
      payload.limit_order_config.asset_quantity =
        Math.floor(payload.limit_order_config.asset_quantity * multiplier) / multiplier;
    }
    if (payload.stop_loss_order_config?.asset_quantity) {
      payload.stop_loss_order_config.asset_quantity =
        Math.floor(payload.stop_loss_order_config.asset_quantity * multiplier) / multiplier;
    }
    if (payload.stop_limit_order_config?.asset_quantity) {
      payload.stop_limit_order_config.asset_quantity =
        Math.floor(payload.stop_limit_order_config.asset_quantity * multiplier) / multiplier;
    }

    const response = await this.makeRequest(
      "/api/v1/crypto/trading/orders/",
      "POST",
      JSON.stringify(payload)
    );
    return {
      ...response,
      average_price: response.average_price
        ? parseFloat(response.average_price as unknown as string)
        : null,
      filled_asset_quantity: parseFloat(
        response.filled_asset_quantity as unknown as string
      ),
    };
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    const response = await this.makeRequest(
      `/api/v1/crypto/trading/orders/${orderId}/`,
      "GET"
    );
    return {
      ...response,
      average_price: response.average_price
        ? parseFloat(response.average_price as unknown as string)
        : null,
      filled_asset_quantity: parseFloat(
        response.filled_asset_quantity as unknown as string
      ),
    };
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    return this.makeRequest(
      `/api/v1/crypto/trading/orders/${orderId}/cancel/`,
      "POST"
    );
  }

  async getOrders(
    filters?: OrderFilters,
    limit?: number,
    cursor?: string
  ): Promise<OrdersResponse> {
    let queryParams: string[] = [];

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.push(`${key}=${value}`);
      });
    }

    if (limit) queryParams.push(`limit=${limit}`);
    if (cursor) queryParams.push(`cursor=${cursor}`);

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    return this.makeRequest(
      `/api/v1/crypto/trading/orders/${queryString}`,
      "GET"
    );
  }

  // Account
  async getAccount(): Promise<AccountResponse> {
    return this.makeRequest("/api/v1/crypto/trading/accounts/", "GET");
  }

  // Holdings
async getHoldings(
    assetCodes?: string[],
    limit?: number,
    cursor?: string
  ): Promise<HoldingsResponse> {
    let queryParams: string[] = [];

    if (assetCodes) {
      assetCodes.forEach((code) => queryParams.push(`asset_code=${code}`));
    }

    if (limit) queryParams.push(`limit=${limit}`);
    if (cursor) queryParams.push(`cursor=${cursor}`);

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    const response = await this.makeRequest(
      `/api/v1/crypto/trading/holdings/${queryString}`,
      "GET"
    );

    // Parse string quantities into numbers
    return {
      ...response,
      results: response.results.map((holding: Holding) => ({
        ...holding,
        total_quantity: parseFloat(holding.total_quantity as unknown as string),
        quantity_available_for_trading: parseFloat(
          holding.quantity_available_for_trading as unknown as string
        ),
      })),
    };
  }
}