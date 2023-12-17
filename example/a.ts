import { z } from 'zod'

export function a(this: Response) {
    return this.url
}

export function helloWorld() {
    return 'hello world'
}

const Word = z.object({
    word: z.string()
})
export function say(this: Response, word: z.infer<typeof Word>) {
    word = Word.parse(word)

    return word
}

export default function () {
    return 'hello'
}
