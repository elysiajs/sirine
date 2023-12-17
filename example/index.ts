import { sirine, client } from '../src'
import * as a from './a'
import * as b from './b'

const server = sirine(a, b, {
    hello: async () => 'Sirin'
}).listen(3000)

type server = typeof server

const app = client<server['types']>('http://localhost:3000')

const response = await app.many('hello', 'world')

console.log(response)
