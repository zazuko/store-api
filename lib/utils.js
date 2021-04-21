/**
 * Chunks a multiline string or Buffer and maps `fn` to wrap each chunk
 * ```js
 * chunkBetween('a\nb\nc', (chunk) => `INSERT { ${chunk} }`, 2)
 * // INSERT { a\nb }
 * // INSERT { c }
 * ```
 * @param {string | Buffer} input
 * @param {function} fn - Function mapped to each chunk
 * @param {number} [chunkSize=5_000] - Size of each chunk
 * @returns string[]
 */
export function chunkBetween (input, fn = (chunk) => chunk, chunkSize = 5_000) {
  const lines = Buffer.isBuffer(input)
    ? bufferToLines(input)
    : stringToLines(input)

  return chunk(lines, chunkSize)
    .map(chunk => fn(chunk.join('\n')))
}

export function chunk (xs, chunkSize = 5_000) {
  const chunks = []
  for (let i = 0; i < xs.length; i += chunkSize) {
    chunks.push(xs.slice(i, i + chunkSize))
  }
  return chunks
}

function bufferToLines (buffer) {
  const n = '\n'.charCodeAt()
  const buffers = []
  for (let i = 0, begin = 0; i < buffer.byteLength; i++) {
    if (buffer[i] === n) {
      buffers.push(buffer.slice(begin, i))
      begin = i + 1
    }
  }
  return buffers.map(buffer => buffer.toString())
}

function stringToLines (str) {
  return str.split('\n')
}
