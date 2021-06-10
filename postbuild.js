const fs = require('fs');

fs.writeFileSync('./.env', 'MONGODB_URL=mongodb+srv://admin:mfWdh6eHtZvqMqh6@gemini-main.kutxt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority');
fs.rm('./postbuild.js', () => {});
