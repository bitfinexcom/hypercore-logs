const chai = require('chai')
  .use(require('dirty-chai'))
const { expect } = chai
const { bisect } = require('../src/bisect')

module.exports = () => {
  describe('bisect tests', () => {
    it('must find the nearest index', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7]

      const index = await bisect(item => item < 4 ? -1 : 1, i => data[i], data.length)

      expect(index).to.eq(data.indexOf(3))
    })

    it('out of bounds', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7]

      const index = await bisect(item => item > 8 ? 1 : -1, i => data[i], data.length)

      expect(index).to.eq(data.length - 1)
    })
  })
}
