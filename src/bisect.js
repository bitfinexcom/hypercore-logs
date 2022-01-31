'use strict'

async function bisect (compare, getByIndex, length) {
  let top = length
  let bottom = 0

  async function _bisect () {
    const middle = Math.floor((top + bottom) / 2)
    const data = await getByIndex(middle)
    const cmp = compare(data)

    if (cmp < 0) {
      bottom = middle
    } else {
      top = middle
    }

    const newMiddle = Math.floor((top + bottom) / 2)
    if (newMiddle === middle) {
      return middle
    }

    return _bisect()
  }

  return _bisect()
}

module.exports = {
  bisect
}
