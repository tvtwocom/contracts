const assert = require('assert')

const testWillThrow = async (fn, args) => {
  try {
    await fn(...args)
    assert(false, 'the contract should throw here')
  } catch (error) {
    assert(
      // TODO: is this actually ok to check for revert here? need to investigate more...
      /invalid opcode|revert/.test(error),
      `the error message should be invalid opcode, the error was ${error}`
    )
  }
}

module.exports = {
  testWillThrow
}
