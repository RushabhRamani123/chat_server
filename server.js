const app = require('./app');

const http = require('http');

const server = http.createServer(app);

// 3000 or 5000
const port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});