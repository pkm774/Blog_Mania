import express from 'express';

/*const hostname = '192.168.0.107';
const port = 8080;*/

const app = express();
app.use(express.static("public"));

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/blogs', (req, res) => {
    res.render('blogs.ejs');
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

/*app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});*/
