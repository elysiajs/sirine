# sirine

Export function as endpoint.

Installation:

```bash
bun add sirine
```

Suppose you have an existing function:

```typescript
// utils.ts
export function hello(person: string) {
    return `hello ${person}`
}
```

We can turns the function into an endpoint:

```typescript
import { sirine } from 'sirine'
import * as utils from './utils'

const server = sirine(utils).listen(3000)
```

The function name will turn into an endpoint, in this case as **/hello**

```typescript
// server.ts
import { sirine } from 'sirine'
import * as utils from './utils'

const server = sirine(utils).listen(3000)
export type server = typeof server
```

Then import Sirine client and server type on client.

```typescript
// client.ts
import { client } from 'sirine'

const app = client<server['types']>('http://localhost:3000')

app.hello().then(console.log)
```

## Why

To export function into an endpoint in the most easiest/convenient way possible.

Sirine is intent **NOT TO** to replace or compete with existing HTTP-based framework nor being more than just exposing function to network.

Sirine is an RPC-like client-server with end-to-end type safety for TypeScript developer who just wants to run functions on edge.

Sirine **do not** do the following:

-   Validate input/output
-   Interact with how HTTP work

## How it works

sirine is a function that may accept multiple 1 level-deep object with a value of function.

Each function will be register as HTTP by the following condition:

-   **GET** - function accept **DO NOT** paramter
-   **POST** - function accept paramter

The method should list as follows:

| Function     | Method |
| ------------ | ------ |
| say() {}     | GET    |
| say(word) {} | POST   |

Each function name will turn into an endpoint name separated by `/` for each camelCase separation.

The path should list as follows:

| Function      | Path       |
| ------------- | ---------- |
| say() {}      | /say       |
| sayHello() {} | /say/hello |
| index() {}    | /          |
| default() {}  | /          |

## Handler

Each function may or may not accept one parameters which will always be a value of HTTP body.

```typescript
export function hello(word: string) {
    return word
}
```

We may interact with HTTP `Request` by accessing `this`.

```typescript
export function hello(this: Response) {
    return this.url
}
```


## Validation

Sirine doesn't provide validation but we recommend using Zod for easy integration.

```typescript
import { z } from 'zod'

const Word = z.object({
    word: z.string()
})
export function say(this: Response, word: z.infer<typeof Word>) {
    word = Word.parse(word)

    return word
}
```

## Types
We may use infers the type of the server by the following:

### Server to client
Accessing `Sirine.types`, and pass to `client<T>`

On the server, we create a new Sirine instance.
```typescript
// server.ts
import { sirine } from 'sirine'
import * as utils from './utils'

const server = sirine(utils).listen(3000)
export type server = typeof server
```

Then import Sirine client and server type on client.

```typescript
// client.ts
import { client } from 'sirine'

const app = client<server['types']>('http://localhost:3000')

app.hello().then(console.log)
```

This will create the order of type as the following:
```
utils ---> server ---> client
```

### Shared to client and server

On monorepo, if we have access shared utilities on both client and server, we may pass the types to client directly.

```typescript
// server.ts
import { sirine } from 'sirine'
import * as utils from '@workspace/utils'

const server = sirine(utils).listen(3000)
```

Then on the client, we import the same shared utils.

```typescript
// client.ts
import { client } from 'sirine'
import * as utils from '@workspace/utils'

const app = client<typeof utils>('http://localhost:3000')

app.hello().then(console.log)
```

This will create the order of type as the following:
```
utils ---> server
utils ---> client
```

## Server Specification
Sirine server may only introduce either **GET** or **POST** method.

The content-type may only be **application/json** or **multipart/formdata**.

If content-type is provide as **multipart/form-data**, the parameter may only be a singular in constrast to **application/json**

## Runtime
By default Sirine the following runtime using `Sirine.listen` out of the box:
- Bun
- Deno
- Node (via [@whatwg-node/server](https://npmjs.com/package/@whatwg-node/server))

Sirine is using Web Standard Request / Response allowing compatible with WinterCG compliance runtime, for example:
- Cloudflare
- Vercel Edge Function
- Lagon

We may access `Sirine.handle` which accepts Web Standard Request / Response to integrate with the runtime above.
