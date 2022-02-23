import http from 'http'

const server = http.createServer((req, res) => {
  res.end('OK')
})

server.listen(3000)
