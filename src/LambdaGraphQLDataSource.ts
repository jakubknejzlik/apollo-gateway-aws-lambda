const aws = require("aws-sdk");
import { Lambda } from "aws-sdk";
const lambda = new Lambda({});

import {
  GraphQLRequestContext,
  GraphQLResponse,
  ValueOrPromise
} from "apollo-server-types";
import {
  ApolloError,
  AuthenticationError,
  ForbiddenError
} from "apollo-server-errors";
import { Request, Headers } from "apollo-server-env";
import { isObject } from "./predicates";
import { GraphQLDataSource } from "./types";

interface LambdaResponse {
  StatusCode: number;
  ExecutedVersion: string;
  Payload: string;
}

export class LambdaGraphQLDataSource implements GraphQLDataSource {
  constructor(
    config?: Partial<LambdaGraphQLDataSource> &
      object &
      ThisType<LambdaGraphQLDataSource>
  ) {
    if (config) {
      return Object.assign(this, config);
    }
  }

  functionName!: string;
  path = "/graphql";

  async process<TContext>({
    request,
    context
  }: Pick<GraphQLRequestContext<TContext>, "request" | "context">): Promise<
    GraphQLResponse
  > {
    const headers = (request.http && request.http.headers) || new Headers();
    headers.set("Content-Type", "application/json");

    request.http = {
      method: "POST",
      url: this.functionName,
      headers
    };

    if (this.willSendRequest) {
      await this.willSendRequest({ request, context });
    }

    try {
      const headers: { [key: string]: string } = {};
      for (const [key, value] of request.http.headers) {
        headers[key] = value;
      }
      const event = {
        body: Buffer.from(JSON.stringify(request)).toString("base64"),
        path: this.path,
        httpMethod: request.http.method,
        isBase64Encoded: true,
        headers
      };

      const lambdaResponse = await lambda
        .invoke({
          FunctionName: "graphql-orm-example",
          Payload: JSON.stringify(event, null, 2) // pass params
        })
        .promise();

      const body = await this.didReceiveResponse(lambdaResponse, context);

      if (!isObject(body)) {
        throw new Error(`Expected JSON response body, but received: ${body}`);
      }

      const response: GraphQLResponse = {
        ...body
      };

      return response;
    } catch (error) {
      this.didEncounterError(error);
      throw error;
    }
  }

  public willSendRequest?<TContext>(
    requestContext: Pick<GraphQLRequestContext<TContext>, "request" | "context">
  ): ValueOrPromise<void>;

  public async didReceiveResponse<TResult = any, TContext = any>(
    response: Lambda.InvocationResponse,
    _context?: TContext
  ): Promise<TResult> {
    if (
      response.StatusCode &&
      response.StatusCode >= 200 &&
      response.StatusCode < 300
    ) {
      return (this.parseBody(response) as any) as Promise<TResult>;
    } else {
      throw await this.errorFromResponse(response);
    }
  }

  public didEncounterError(error: Error) {
    throw error;
  }

  public async parseBody(
    response: Lambda.InvocationResponse
  ): Promise<object | string> {
    if (typeof response.Payload === "undefined") {
      return {};
    }
    const payload = JSON.parse(response.Payload.toString());
    return JSON.parse(payload.body);
  }

  public async errorFromResponse(response: Lambda.InvocationResponse) {
    // const message = `${response.StatusCode}: ${response.}`;
    const message = `unexpected error`;

    let error: ApolloError;
    if (response.StatusCode === 401) {
      error = new AuthenticationError(message);
    } else if (response.StatusCode === 403) {
      error = new ForbiddenError(message);
    } else {
      error = new ApolloError(message);
    }

    const body = await this.parseBody(response);

    Object.assign(error.extensions, {
      response: {
        // url: response.url,
        status: response.StatusCode,
        // statusText: response.statusText,
        body
      }
    });

    return error;
  }
}
