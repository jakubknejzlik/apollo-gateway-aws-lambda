"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_xray_sdk_1 = require("aws-xray-sdk");
const lambda_1 = __importDefault(require("aws-sdk/clients/lambda"));
const lambda = aws_xray_sdk_1.captureAWSClient(new lambda_1.default({}));
const apollo_server_errors_1 = require("apollo-server-errors");
const apollo_server_env_1 = require("apollo-server-env");
const predicates_1 = require("./predicates");
class LambdaGraphQLDataSource {
    constructor(config) {
        this.path = "/graphql";
        if (config) {
            return Object.assign(this, config);
        }
    }
    process({ request, context }) {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = (request.http && request.http.headers) || new apollo_server_env_1.Headers();
            headers.set("Content-Type", "application/json");
            request.http = {
                method: "POST",
                url: this.functionName,
                headers
            };
            if (this.willSendRequest) {
                yield this.willSendRequest({ request, context });
            }
            try {
                const headers = {};
                for (const [key, value] of request.http.headers) {
                    headers[key] = value;
                }
                const event = {
                    headers,
                    body: Buffer.from(JSON.stringify(request)).toString("base64"),
                    path: this.path,
                    httpMethod: request.http.method,
                    isBase64Encoded: true,
                    pathParameters: {
                        proxy: this.path
                    },
                    requestContext: {
                        accountId: "dummy"
                    }
                };
                const lambdaResponse = yield lambda
                    .invoke({
                    FunctionName: this.functionName,
                    Payload: JSON.stringify(event, null, 2)
                })
                    .promise();
                const body = yield this.didReceiveResponse(lambdaResponse, context);
                if (!predicates_1.isObject(body)) {
                    throw new Error(`Expected JSON response body, but received: ${body}`);
                }
                const response = Object.assign({}, body);
                return response;
            }
            catch (error) {
                this.didEncounterError(error);
                throw error;
            }
        });
    }
    didReceiveResponse(response, _context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (response.StatusCode &&
                response.StatusCode >= 200 &&
                response.StatusCode < 300) {
                return this.parseBody(response);
            }
            else {
                throw yield this.errorFromResponse(response);
            }
        });
    }
    didEncounterError(error) {
        throw error;
    }
    parseBody(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof response.Payload === "undefined") {
                return {};
            }
            const payload = JSON.parse(response.Payload.toString());
            return JSON.parse(payload.body);
        });
    }
    errorFromResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `unexpected error`;
            let error;
            if (response.StatusCode === 401) {
                error = new apollo_server_errors_1.AuthenticationError(message);
            }
            else if (response.StatusCode === 403) {
                error = new apollo_server_errors_1.ForbiddenError(message);
            }
            else {
                error = new apollo_server_errors_1.ApolloError(message);
            }
            const body = yield this.parseBody(response);
            Object.assign(error.extensions, {
                response: {
                    status: response.StatusCode,
                    body
                }
            });
            return error;
        });
    }
}
exports.LambdaGraphQLDataSource = LambdaGraphQLDataSource;
//# sourceMappingURL=LambdaGraphQLDataSource.js.map