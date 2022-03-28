const express = require('express');
const app = express();

app.get('/', (_, res) => {
    res.end('Hello, World!');
});

app.listen(3000);
