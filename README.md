# hypercore-logs

Hypercore logs is an API and CLI tool that provides functionality for writing/reading logs through hypercores. Currently it supports the following write formats:
- `hypercore-logger` - this one is just the base wrapper for hypercore logs and the user could use this one to write it's own custom log transports
- `hypercore-file-logger` - this one writes tail of the file to the logger feed
- `hypercore-udp-logger` - this one reads logs though a udp server and writes them to the logger feed

The logs can be red simply though an transport layer agnostic module known as `hypercore-log-reader`.

Beside providing the API for custom integrations the package contains also it's own cli tool (`hyperlog`) that can we be used for writing and reading logs.

## Setup

You can simply install the tool by running `npm i -g https://github.com/bitfinexcom/hypercore-logs.git` and then you can use the cli by running `hyperlog` cmd through terminal. For custom code integration install it localy without `global` flag!

Also if you want to install specific version (preffered way), you can install it with release tag, e.g. `npm i -g https://github.com/bitfinexcom/hypercore-logs.git#v0.3.3`

## Command line docs

The command line tool provides two basic commands:
- `read` - read the hypercore log from destination by specifying the public key
- `write` - write to the hypercore log from tailing file or udp server

The command can be run like this:
```console
hyperlog --help
hyperlog <command>

Commands:
  hyperlog read   creates a reader for a hypercore log
  hyperlog write  creates a hypercore log writer

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

Write command usage:
```console
hyperlog write --help
hyperlog write

creates a hypercore log writer

Options:
  --version         Show version number                                [boolean]
  --help            Show help                                          [boolean]
  --key, -k         feed public key, use either hex string or path to file, if
                    not specified alongside with 'secret-key' it will generate a
                    new one                                             [string]
  --secret-key, -s  feed private key, use either hex string or path to file, if
                    not specified alongside with 'key' it will generate a new
                    one                                                 [string]
  --datadir, -d     feed data directory, if ommited RAM memory will be used
                                                                        [string]
  --file, -f        file, dir or glob pattern that will be tailed, use quoted
                    arg when passing globs! Use either file or port option.
                                                                        [string]
  --republish       republish entire file to the stream, used alongside file
                    option                            [boolean] [default: false]
  --port, -p        UDP server port, use either file or port option     [number]
```

Read command usage:
```console
hyperlog read --help
hyperlog read

creates a reader for a hypercore log

Options:
  --version      Show version number                                   [boolean]
  --help         Show help                                             [boolean]
  --key, -k      feed public key, use either hex string or path to file
                                                             [string] [required]
  --datadir, -d  feed data directory, if ommited RAM memory will be used[string]
  --output, -o   log output directory or file, if not provided output will be
                 logged to console.                                     [string]
  --remote-prefix, -rp   path prefix to be omitted                              [string]
  --console, -c  log output to console, if output provided and console ommited
                 then output would be logged only in file!             [boolean]
  --tail         tail the log file                                     [boolean]
  --start        feed read start, ignored in case if tail is specified, if
                 negative it's considered from feed end                 [number]
  --end          feed read end, ignored in case if tail is specified, if
                 negative it's considered from feed end                 [number]
  --start-date   feed read start by date, ignored in case if start
                 is specified                                           [string]
  --end-date     feed read end by date, ignored in case if end
                 is specified                                           [string]
  --include      filter logs by Regular expression                      [string]
  --exclude      exclude logs by Regular expression, can be used along
                 with "include" option                                  [string]
```

## Examples

### Example - tail file

```console
hyperlog write --file ../logs/1597852241433.log --datadir ../tmp
hcore-logger key: 3c4e86d7ffdaf790d61c62bb1a025f2fa73b3881c19178ca3d08767b59c46023 +0ms
hcore-logger secret-key: c8308cbeb469ee4a0a9add423bfd0197198cc08f61a8a029a0afd47f8930c84b3c4e86d7ffdaf790d61c62bb1a025f2fa73b3881c19178ca3d08767b59c46023 +5ms
hcore-logger feed started listening for changes on ../logs/1597852241433.log +0ms
```

### Example - tail dir

```console
hyperlog write --file ../logs
hcore-logger key: 482233ad2a7575010f4f9a7a19e013f5d6fa52f83b5f282b7b2c9928c6b334de +0ms
hcore-logger secret-key: 6601acc4386c805f7a95f675369a6c96d6c5a207162eb0397a89a007fb282221482233ad2a7575010f4f9a7a19e013f5d6fa52f83b5f282b7b2c9928c6b334de +2ms
hcore-logger feed started listening for changes on /home/vigan/Desktop/bitfinex/logs/test1.log, /home/vigan/Desktop/bitfinex/logs/test2.log +0ms
```

### Example - tail glob pattern

```console
hyperlog write --file '../logs/**/*.log'
hcore-logger key: e686ec27b4699bc3039c344d2fd9a52daaf022fcac986dc345c2d49b3b6174b9 +0ms
hcore-logger secret-key: 233a0e66b2f6dc46c7bedf0d60c49e47744c0758d5a41ff5ed0ee54364c1e704e686ec27b4699bc3039c344d2fd9a52daaf022fcac986dc345c2d49b3b6174b9 +3ms
hcore-logger feed started listening for changes on /home/vigan/Desktop/bitfinex/logs/test1.log, /home/vigan/Desktop/bitfinex/logs/test2.log +0ms
```

### Example - udp server

```console
hyperlog write --port 7070 \
  --key 3c4e86d7ffdaf790d61c62bb1a025f2fa73b3881c19178ca3d08767b59c46023 \
  --secret-key c8308cbeb469ee4a0a9add423bfd0197198cc08f61a8a029a0afd47f8930c84b3c4e86d7ffdaf790d61c62bb1a025f2fa73b3881c19178ca3d08767b59c46023
```

UDP client for sending packages:
```console
nc -u 127.0.0.1 7070
some test message
another test message
```

### Example - reader

```console
hyperlog read --key 3c4e86d7ffdaf790d61c62bb1a025f2fa73b3881c19178ca3d08767b59c46023 --tail
```

### Example - read and store to file

```console
hyperlog read --key 8be30f022777683321f685125315e5a7a79a1978829e5e4416037e9bb30fef8e --output test3.log --console
```

### Example - read and store to dir

```console
hyperlog read --key 8be30f022777683321f685125315e5a7a79a1978829e5e4416037e9bb30fef8e --output test3/ --input-dir /home/dev/logs/
```

### Example - read and filter logs that contains "[client]" at the start and doesn't contain "fatal" word

```console
hyperlog read --key 8be30f022777683321f685125315e5a7a79a1978829e5e4416037e9bb30fef8e --console --include "\[server\]" --exclude "warn"
```

### Example - code

Log writer:
```js
const cwd = process.cwd()
const feedDir = path.join(cwd, '/tmp/data')

const server = new HyperCoreLogger(feedDir)

const main = async () => {
  await server.start()
  const pubinterval = setInterval(() => {
    server.feed.append('some data')
  }, 3000)

  setTimeout(async () => {
    clearInterval(pubinterval)
    await server.stop()
  }, 20000)
}

main()

```

Log reader:
```js
const key = '0db350f414a93274e5613930b79c7226f21270cfc1435b96350422a0abf63dc2'
const client = new HyperCoreLogReader(() => ram(), key, null, null, { snapshot: false, tail: true })

const main = async () => {
  client.on('data', (data) => console.log(data.toString().trim()))
  await client.start()

  setTimeout(async () => {
    await client.stop()
  }, 60000)
}

main()

```

More examples can be found under examples directory!
