import Lambda from "aws-sdk/clients/lambda";
import { GraphQLRequestContext, GraphQLResponse, ValueOrPromise } from "apollo-server-types";
import { ApolloError } from "apollo-server-errors";
import { GraphQLDataSource } from "./types";
export declare class LambdaGraphQLDataSource implements GraphQLDataSource {
    constructor(config?: Partial<LambdaGraphQLDataSource> & object & ThisType<LambdaGraphQLDataSource>);
    functionName: string;
    path: string;
    process<TContext>({ request, context }: Pick<GraphQLRequestContext<TContext>, "request" | "context">): Promise<GraphQLResponse>;
    willSendRequest?<TContext>(requestContext: Pick<GraphQLRequestContext<TContext>, "request" | "context">): ValueOrPromise<void>;
    didReceiveResponse<TResult = any, TContext = any>(response: Lambda.InvocationResponse, _context?: TContext): Promise<TResult>;
    didEncounterError(error: Error): void;
    parseBody(response: Lambda.InvocationResponse): Promise<object | string>;
    errorFromResponse(response: Lambda.InvocationResponse): Promise<ApolloError>;
}
