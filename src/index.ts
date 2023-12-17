import { Memoirist } from 'memoirist'
import { literal } from 'zod'

const parseBodyError = (error: Error) =>
    Response.json(error, {
        status: 400
    })

export const mapResponse = (response: unknown): Response => {
    switch (response?.constructor?.name) {
        case 'String':
            return new Response(response as string)

        case 'Blob':
            const size = (response as File).size
            if (size)
                return new Response(response as Blob, {
                    headers: {
                        'accept-ranges': 'bytes',
                        'content-range': `bytes 0-${size - 1}/${size}`
                    }
                })
            else return new Response(response as Blob)

        case 'Object':
        case 'Array':
            return Response.json(response as Record<string, unknown>)

        case 'ReadableStream':
            return new Response(response as ReadableStream, {
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8'
                }
            })

        case undefined:
            if (!response) return new Response('')

            return new Response(JSON.stringify(response), {
                headers: {
                    'content-type': 'application/json'
                }
            })

        case 'Response':
            return response as Response

        case 'Error':
            return Response.json(response as Error, {
                status: 500
            })

        case 'Promise':
            // @ts-ignore
            return (response as any as Promise<unknown>).then((x) => {
                const r = mapResponse(x)
                if (r !== undefined) return r

                return new Response('')
            })

        // ? Maybe response or Blob
        case 'Function':
            return mapResponse((response as Function)())

        case 'Number':
        case 'Boolean':
            return new Response((response as number | boolean).toString())

        default:
            const r = JSON.stringify(response)
            if (r.charCodeAt(0) === 123)
                return new Response(JSON.stringify(response), {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }) as any

            return new Response(r)
    }
}

const camelCaseToPath = (str: string) =>
    str
        .replace(/([A-Z])/g, '/$1')
        .trim()
        .toLowerCase()

const getPath = (url: string) => {
    const s = url.indexOf('/', 11)
    const qi = url.indexOf('?', s + 1)
    return url.substring(s, qi === -1 ? undefined : qi)
}

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
    x: infer I
) => void
    ? I
    : never

export type Merge<Modules extends Record<string, unknown>[]> = Prettify<
    UnionToIntersection<Modules[number]>
>

export const sirine = <Modules extends Record<string, unknown>[]>(
    ...modules: Modules
) => {
    const router = new Memoirist<{ handle: Function; useRequest: boolean }>()

    for (const module of modules)
        for (const [key, value] of Object.entries(module)) {
            if (typeof value === 'function') {
                const literal = (value as Function).toString()
                const parameter = literal.split('\n', 1)[0]
                const noParameter = parameter.includes('()')

                router.add(
                    noParameter ? 'GET' : 'POST',
                    key === 'index' || key === 'default'
                        ? '/'
                        : `/${camelCaseToPath(key)}`,
                    {
                        handle: value,
                        useRequest: literal.includes('this')
                    }
                )
            }
        }

    const handle = (request: Request) => {
        const route = router.find(request.method, getPath(request.url))

        if (route) {
            const handle = route.store.useRequest
                ? route.store.handle.bind(request)
                : route.store.handle

            if (request.method === 'GET') return mapResponse(handle())
            else {
                const contentType = request.headers.get('content-type')

                if (contentType)
                    return (async () => {
                        const body = contentType?.startsWith(
                            'multipart/form-data'
                        )
                            ? await request.formData().catch(parseBodyError)
                            : await request.json().catch(parseBodyError)

                        if (body instanceof Response) return body

                        try {
                            return mapResponse(handle(...body))
                        } catch (error) {
                            if (error instanceof Error)
                                return Response.json(error, {
                                    status: 500
                                })

                            return Response.json(
                                {
                                    name: 'error',
                                    message: 'unknown error'
                                },
                                {
                                    status: 500
                                }
                            )
                        }
                    })()

                return mapResponse(handle())
            }
        }

        return new Response('NOT_FOUND')
    }

    let server: unknown

    return {
        router,
        handle,
        server,
        listen(port: number) {
            // @ts-ignore
            if (typeof Bun !== 'undefined') {
                // @ts-ignore
                server = Bun.serve({
                    port,
                    reusePort: true,
                    fetch: handle
                })

                return this
            }

            // @ts-ignore
            if (typeof Deno !== 'undefined') {
                // @ts-ignore
                server = Deno.serve({ port }, handle)

                return this
            }

            if (typeof process?.versions?.node !== 'undefined') {
                ;(async () => {
                    const { createServer } = await import('node:http')
                    const polyfill = await import('@whatwg-node/server')

                    if (!polyfill.createServerAdapter)
                        throw new Error(
                            "Please install '@whatwg-node/server' to use Sirine on Node.js"
                        )

                    return (server = createServer(
                        polyfill.createServerAdapter(handle)
                    ).listen(port))
                })()

                return this
            }

            throw new Error('Unknown environment')

            return this
        },
        types: undefined as unknown as Merge<Modules>
    } as const
}

const deserialize = (response: Response) => {
    if (response.headers.get('content-type')?.startsWith('application/json'))
        return response.json()

    return response.text().then((value) => {
        if (!Number.isNaN(+value)) return +value
        if (value === 'true') return true
        if (value === 'false') return false
        return value
    })
}

export const client = <Module extends Record<string, (...a: any[]) => any>>(
    url: string
): {
    [K in keyof Module]: (
        ...body: Parameters<Module[K]>
    ) => Promise<ReturnType<Module[K]>>
} => {
    if (url.endsWith('/')) url = url.slice(0, -1)

    return new Proxy(
        {},
        {
            get: (_, key) => {
                return (...body: unknown[]) => {
                    const path =
                        url +
                        (key === 'index' || key === 'default'
                            ? '/'
                            : `/${camelCaseToPath(key as string)}`)

                    if (body === undefined || body.length === 0)
                        return fetch(path).then(deserialize)

                    if (body === null)
                        return fetch(path, {
                            method: 'POST',
                            body: 'null',
                            headers: {
                                'content-type': 'application/json'
                            }
                        }).then(deserialize)

                    if (
                        body.length === 1 &&
                        body[0] !== null &&
                        typeof body[0] === 'object'
                    ) {
                        const formData = new FormData()
                        let isFormData = false

                        for (const [key, value] of Object.entries(body[0])) {
                            if (value instanceof File || value instanceof Blob)
                                isFormData = true

                            // @ts-ignore
                            formData.append(key, value)
                        }

                        if (isFormData)
                            return fetch(path, {
                                method: 'POST',
                                body: formData
                            }).then(deserialize)
                    }

                    return fetch(path, {
                        method: 'POST',
                        body: JSON.stringify(body),
                        headers: {
                            'content-type': 'application/json'
                        }
                    }).then(deserialize)
                }
            }
        }
    ) as any
}
