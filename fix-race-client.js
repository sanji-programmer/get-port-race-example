// using solution proposed by @Charliekenney23

const getPort = require('get-port')
const http = require('http')
const fs = require('fs')

const { Mutex } = require('async-mutex')
const mutex = new Mutex()

function handler(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end("some text")
}

const desiredPorts = []
const CONCUR = 10

for (let i = 0; i < CONCUR; i++)
    desiredPorts.push(4000 + i)

let usedPorts = new Set()

function createServer() {
    return new Promise((resolve, reject) => {
        //simulate some unpredicable scheduling of callbacks
        fs.readFile('package.json', () => {

            // critical area
            mutex
                .acquire()
                .then(function (release) {

                    getPort({
                        port: desiredPorts          //limit the options, increase the likeliness of a race
                    }).then((port) => {
                        console.log(port)
                        if (usedPorts.has(port))
                            console.log(`port ${port} already used`)

                        usedPorts.add(port)

                        let server = http.createServer(handler).listen(port)
                        release()   //the lock
                        resolve(server)
                    })

                })
            // critical area
        })
    })
}

let promises = []
for (let i = 0; i < CONCUR; i++) {
    let pServer = createServer()
    promises.push(pServer)
}

Promise.all(promises)
    .then((res) => {
        res.forEach(server => {
            server.close()
        })
    })