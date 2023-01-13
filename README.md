<p align="center"><img src="https://github.com/dotansimha/graphql-yoga/raw/master/website/public/banner.svg" width="350" /></p>

# GraphQL Yoga for Cloudflare Workers (Wrangler template)

Fully-featured GraphQL Server with focus on easy setup, performance & great developer experience:

- **Easiest way to run a GraphQL server:** Sensible defaults & includes everything you need with minimal setup (we also export a platform/env-agnostic handler so you can build your own wrappers easily).
- **Includes Subscriptions:** Built-in support for GraphQL subscriptions using **S**erver-**S**ent **E**vents.
- **Compatible:** Works with all GraphQL clients (Apollo, Relay...) and fits seamless in your GraphQL workflow.
- **WHATWG Fetch API:** the core package depends on [WHATWG Fetch API](https://fetch.spec.whatwg.org/) so it can run and deploy on any environment (Serverless, Workers, Deno, Node).
- **Easily Extendable:** New GraphQL-Yoga support all [`envelop`](https://www.envelop.dev) plugins.


<br />

[**See it in action!**](https://my-yoga-worker.cpolyeng.workers.dev)

<br />

[Read the 2.0 announcement blog post](https://www.the-guild.dev/blog/announcing-graphql-yoga-v2)

[Read the docs](https://www.graphql-yoga.com/docs/quick-start)


[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/the-guild-org/yoga-cloudflare-workers-template)

<p>&nbsp;</p>

----

<p>&nbsp;</p>

## Getting started


1. Install and configure wrangler

```sh
npm i @cloudflare/wrangler -g

wrangler login
```


2. Create a new project with the GraphQL Yoga template

```sh
 wrangler generate graphql-yoga-worker https://github.com/the-guild-org/yoga-cloudflare-workers-template
```


3. Build and deploy your CF Worker GraphQL API

```sh
cd graphql-yoga-worker
wrangler build
wrangler publish
```

<p>&nbsp;</p>

----

<p>&nbsp;</p>

## Project overview

### Yoga configuration

GraphQL Yoga comes with defaults for CORS and error handling:
- CORS are enabled by default
- Automatically masking unexpected errors and preventing sensitive information leaking to clients.

Yoga also brings support (with no additional dependency) for subscriptions, file uploads and your favourite schema building library (GraphQL Tools, Pothos, Nexus, TypeGraphQL, SDL first schema-design approaches, graphql-js, Apollo Tools).


More information on all available features [on the official documentation](https://www.graphql-yoga.com/docs/quick-start).

<p>&nbsp;</p>

### Envelop Plugins

GraphQL Yoga is built on top of [Envelop](https://www.envelop.dev/).
[Envelop](https://www.envelop.dev/) is a library that helps build GraphQL API faster and flexibly with plugin-based architecture.

Similar to Express middlewares allowing you to customize requests' behavior, Envelop applies the same idea to GraphQL requests.

By exposing hooks in all the phases of a GraphQL Request execution, Envelop enables the creation of plugins that simplify the setup of standard API features such as:
- Security: Depth limits, Rate limiting
- Authentication
- Advanced caching
- Error handling: Sentry, error masking
- Monitoring: Hive
- Logging
- Tracing: NewRelic, Datadog, StatsD, Apollo Tracing

More information on [Envelop documentation](https://www.envelop.dev/docs).


_Note: Some Node.js specific plugins such as `useSentry()` are supported in Serverless environments_

<p>&nbsp;</p>

### Caching

GraphQL Yoga is relying on `fetch()` WHATWG Fetch API, allowing you to [leverage Cloudflare Cache](https://developers.cloudflare.com/workers/examples/cache-using-fetch/) when fetching data from external services.

For more advanced use-cases, please refer to the `useResponseCache()` Envelop plugins, with a Redis cache (memory cache is not supported on Serverless).


<p>&nbsp;</p>

### Bundle size

**GraphQL Yoga bundle is 36% lighter than Apollo Cloudflare Server** (_Wrangler bundled script comparison_), leading is a faster startup and deployment time. ⚡️




<p>&nbsp;</p>

----

<p>&nbsp;</p>

## Going futher

- [GraphQL Yoga features documentation](https://www.graphql-yoga.com/docs/quick-start)
- [GraphQL Yoga on Cloudflare Workers](https://www.graphql-yoga.com/docs/integrations/integration-with-cloudflare-workers)



<p>&nbsp;</p>

----

<p>&nbsp;</p>


## License

This project is licensed with the [MIT License](./LICENSE).
