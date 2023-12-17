import { z } from 'zod'

export const b = () => 'hello'

export const many = (a: string, b: string) => {
    return {
        word: a + ' ' + b
    }
}
