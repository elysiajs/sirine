import { describe, expect, it } from 'bun:test'
import { sirine } from '../src'

const get = (path: string) => new Request(`http://localhost${path}`)

const json = (path: string, body: Object) =>
    new Request(`http://localhost${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    })

describe('Sirine', () => {
    it('handle request', async () => {
        const { handle } = sirine({
            hello: () => 'Sirin'
        })

        const response = await handle(get('/hello'))
        const result = await response.text()

        expect(result).toBe('Sirin')
    })

    it('handle async', async () => {
        const { handle } = sirine({
            hello: async () => 'Sirin'
        })

        const response = await handle(get('/hello'))
        const result = await response.text()

        expect(result).toBe('Sirin')
    })

    it('handle index', async () => {
        const { handle } = sirine({
            index: () => 'Sirin'
        })

        const response = await handle(get('/'))
        const result = await response.text()

        expect(result).toBe('Sirin')
    })

    it('accept text', async () => {
        const { handle } = sirine({
            hello: (word: string) => word
        })

        const response = await handle(json('/hello', ['Bella']))
        const result = await response.text()

        expect(result).toBe('Bella')
    })

    it('accept JSON', async () => {
        const { handle } = sirine({
            hello: (body: { name: string }) => body
        })

        const response = await handle(
            json('/hello', [
                {
                    name: 'Bella'
                }
            ])
        )
        const result = await response.json()

        expect(result).toEqual({
            name: 'Bella'
        })
    })

    it('throw error', async () => {
        const { handle } = sirine({
            hello: () => {
                return new Error('Sirin')
            }
        })

        const response = await handle(get('/hello'))
        const result = response.status

        expect(result).toEqual(500)
    })

    it('map camelCase to path', async () => {
        const { handle } = sirine({
            goodMorning: () => 'Nice'
        })

        const response = await handle(get('/good/morning'))
        const result = await response.text()

        expect(result).toEqual('Nice')
    })

    it('accept request', async () => {
        const { handle } = sirine({
            hi(this: Request) {
                return this.url
            }
        })

        const response = await handle(get('/hi'))
        const result = await response.text()

        expect(result).toEqual('http://localhost/hi')
    })

    it('multiple instance', async () => {
        const { handle } = sirine(
            {},
            {
                a: () => 'Sirin'
            },
            {
                b: () => 'Bella'
            }
        )

        {
            const response = await handle(get('/a'))
            const result = await response.text()

            expect(result).toBe('Sirin')
        }

        {
            const response = await handle(get('/b'))
            const result = await response.text()

            expect(result).toBe('Bella')
        }
    })
})
