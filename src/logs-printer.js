const fs = require('fs')
const { join, dirname, basename, normalize } = require('path')
const { createDir, createFileDir, fullPath, isDir, isDirPath } = require('../src/helper')
const HyperCoreFileLogger = require('./hypercore-file-logger')

class LogsPrinter {
  async prepareOutputDestination (output) {
    const path = fullPath(output)
    const isDirectory = await isDir(path) || isDirPath(output)
    const dirCreated = isDirectory ? await createDir(path) : await createFileDir(path)

    if (!dirCreated) {
      throw new Error('ERR_MAKE_OUTPUT_DIR_FAILED')
    }

    return {
      demultiplex: isDirectory,
      path: isDirectory ? path : dirname(path),
      file: isDirectory ? `hyperlog-${Date.now()}.log` : basename(path)
    }
  }

  async writeLine (path, line) {
    const options = { flag: 'a' }
    const data = line + '\n'

    return fs.promises.writeFile(path, data, options)
  }

  async setup (options) {
    this.logConsole = options.output ? options.console : true
    this.prefixRegExp = options['remote-prefix'] ? new RegExp(`^${normalize(options['remote-prefix'])}`) : null
    this.destination = options.output ? await this.prepareOutputDestination(options.output) : {}
    this.include = options.include ? new RegExp(options.include) : null
    this.exclude = options.exclude ? new RegExp(options.exclude) : null
  }

  async print (data) {
    const { path: destination, file, demultiplex } = this.destination
    const originLine = data.trimRight()
    const line = this.prefixRegExp ? originLine.replace(this.prefixRegExp, '') : originLine

    if (this.include && !line.match(this.include)) return
    if (this.exclude && line.match(this.exclude)) return

    if (this.logConsole) console.log(line)

    if (this.destination) {
      const { path, content } = HyperCoreFileLogger.parseLine(line)

      if (path && demultiplex) {
        const outpath = join(destination, path)

        await createFileDir(outpath)
        await this.writeLine(outpath, content)
      } else {
        const outpath = join(destination, file)

        await this.writeLine(outpath, line)
      }
    }
  }
}

module.exports = LogsPrinter
