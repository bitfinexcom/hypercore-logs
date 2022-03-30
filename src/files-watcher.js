'use strict'

const _ = require('lodash')
const fs = require('fs')
const chokidar = require('chokidar')
const readline = require('readline')
const { EventEmitter } = require('events')
const { isGlob } = require('./helper')
const Tail = require('tail').Tail

class FilesWatcher extends EventEmitter {
  /**
   * @param {string} pathlike File path or glob pattern that will be tailed
   * @param {boolean} republish Republish entire file at watch start
   * @param {string} [encoding]
   */
  constructor (pathlike, republish, encoding = 'utf-8') {
    super()
    this.pathlike = pathlike
    this.republish = republish
    this.encoding = encoding

    /** @type {Object<string, Tail>} */
    this.fileTails = {}
    /** @type {chokidar.FSWatcher | null} */
    this.watcher = null
    /** @type {boolean} */
    this.isReady = false
  }

  static getFileDelimiter () {
    return ' >>> '
  }

  static parseLine (line) {
    const delimiter = FilesWatcher.getFileDelimiter()
    const [path, ...content] = line.split(delimiter)

    const hasPath = content.length

    return {
      path: hasPath ? path : null,
      content: hasPath ? content.join(delimiter) : line
    }
  }

  static formatLine (line, file = null) {
    const prefix = file ? file + FilesWatcher.getFileDelimiter() : ''

    return prefix + line
  }

  /**
   * @private
   * @param {String} file
   * @param {{ multiple: Boolean, republish: Boolean }} options
   */
  async watchFile (file, options) {
    if (options.republish) {
      const rstream = fs.createReadStream(file, { encoding: this.encoding })

      const rl = readline.createInterface({
        input: rstream,
        crlfDelay: Infinity
      })

      for await (const line of rl) {
        const data = FilesWatcher.formatLine(line, options.multiple && file) + '\n'
        this.emit('data', data)
      }
    }

    const tail = new Tail(file, { encoding: this.encoding })
    tail.on('line', (line) => {
      const data = FilesWatcher.formatLine(line, options.multiple && file) + '\n'
      this.emit('data', data)
    })
    tail.watch()

    this.fileTails[file] = tail
  }

  /**
   * @private
   */
  async unwatchFile (file) {
    const watcher = this.fileTails[file]

    if (watcher) {
      watcher.unwatch()
      delete this.fileTails[file]
    }
  }

  async start () {
    this.watcher = chokidar.watch(this.pathlike, {
      usePolling: true,
      interval: 300
    })

    this.watcher.on('ready', () => {
      this.isReady = true
      this.emit('ready')
    })
    this.watcher.on('add', file => {
      this.watchFile(file, {
        multiple: isGlob(this.pathlike),
        republish: this.republish || this.isReady
      })
      this.emit('add', file)
    })
    this.watcher.on('unlink', file => {
      this.unwatchFile(file)
      this.emit('unlink', file)
    })
  }

  async stop () {
    _.keys(this.fileTails).forEach(file => this.unwatchFile(file))
    if (this.watcher) this.watcher.close()
    this.isReady = false
  }
}

module.exports = FilesWatcher
