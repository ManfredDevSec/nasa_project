// Letter game shared by the near-vision and contrast steps.
// These 10 letters are similar in difficulty to read, so no line is easier by chance.
export const LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z']
export const LETTERS_PER_LINE = 5
export const PASS_MARK = 4 // 4 or more of 5 correct = pass

// Pick 5 random letters, never the same letter twice in a row.
export function randomLetters(count = LETTERS_PER_LINE) {
  const result = []
  while (result.length < count) {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
    if (letter !== result[result.length - 1]) result.push(letter)
  }
  return result
}

// Count letters typed in the right position.
export function countCorrect(target, typed) {
  return target.filter((letter, i) => typed[i] === letter).length
}
