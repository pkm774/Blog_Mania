import express from 'express';
import bodyParser from "body-parser";
import fs from 'fs';

const hostname = '192.168.0.107';
const port = 8080;

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

var folderName = '';
const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

const d = new Date();
var date = d.getDate() + '-' + d.getMonth() + '-' + d.getFullYear();

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/create', (req, res) => {
    res.render('create.ejs');
});

app.post('/save', (req, res) => {
    // Set folder name
    if (!folderName) {
        for (var i = 0; i < 8; ++i) {
            folderName += words[Math.floor(Math.random() * 27)];
        }
    }

    // TODO: 2. Post Viewing
    //       3. Post Update/Delete
    

    // Create folder
    try {
        if (!fs.existsSync(`public/data/blogs/${folderName}`)) {
            fs.mkdirSync(`public/data/blogs/${folderName}`);
        }
    } catch (err) {
        console.error(err);
    }

    // Create blog file
    const data = new Uint8Array(Buffer.from(req.body.blogText));
    fs.writeFile(`public/data/blogs/${folderName}/${date}.txt`, data, (err) => {
        if (err) throw err;
    });

    res.sendStatus(201);
});

app.get('/blogs', (req, res) => {
    res.render('blogs.ejs');
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
