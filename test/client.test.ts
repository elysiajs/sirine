import { describe, expect, it } from 'bun:test'
import { sirine, client } from '../src'

const server = sirine({
    get: () => 'Sirin',
    say: (word: string) => word,
    sum: (a: number, b: number) => a + b,
    json: (value: Object) => value
}).listen(3000)

type server = typeof server

const app = client<server['types']>('http://localhost:3000')

describe('Sirine', () => {
    it('get request', async () => {
        expect(await app.get()).toBe('Sirin')
    })

    it('send paramter', async () => {
        expect(await app.say('Bella')).toBe('Bella')
    })

    it('multiple paramters', async () => {
        expect(await app.sum(1, 2)).toBe(3)
    })

    it('deserialize JSON', async () => {
        expect(
            await app.json({
                hello: 'world'
            })
        ).toEqual({
            hello: 'world'
        })
    })
})
