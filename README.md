# apollo-gateway-aws-lambda

AWS Lambda data source for Apollo Gateway

# Usage

```
const gateway = new ApolloGateway({
  serviceList: urls.map((x, i) => ({ name: names[i] || x, url: x })),
  buildService({ name, url }) {
    const functionName = "...";
    return new LambdaGraphQLDataSource({
      functionName,
      path,
      willSendRequest({ request, context }) {
        // request.http.headers.set('x-correlation-id', '...');
        if (context.req && context.req.headers) {
          request.http.headers.set(
            "authorization",
            context.req.headers["authorization"]
          );
        }
        // console.log('will send request -> ', name, JSON.stringify(request));
      }
    });
  }
});
```

Note: if you are running gateway outside of AWS Lambda, make sure to add `aws-sdk` to you dependencies (it's only in devDependencies in this package)
