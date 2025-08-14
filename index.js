import express from 'express';
import bodyParser from "body-parser";
import fs from 'fs';
//import { v4 as uuidv4 } from 'uuid';

const hostname = '192.168.0.107';
const port = 8080;

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const d = new Date();
var blogDate = d.getDate() + '-' + d.getMonth() + '-' + d.getFullYear();

// Declaration
class BlogData {
    //constructor(uuid, tittle, name, date, body) {
    constructor(tittle, name, date, body) {
        // this.uuid = uuid;
        this.tittle = tittle;
        this.name = name;
        this.date = date;
        this.body = body;
    }
}

var blogs = [];
let counter = 1;

// Create public/data folder
if (!fs.existsSync(`public/data`)) {
    fs.mkdirSync(`public/data`);
    console.log('Created public/data folder');
}
// Create public/data/blogs folder
if (!fs.existsSync(`public/data/blogs`)) {
    fs.mkdirSync(`public/data/blogs`);
    console.log('Created public/data/blogs folder');
}

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/create', (req, res) => {
    res.render('create.ejs');
});

app.post('/save', (req, res) => {
    // Create blog file
    const fileName = req.body.name;
    const data = 'Tittle: ' + req.body.tittle + '\nAuthor: ' + fileName + '\nDate: ' + blogDate + '\n\n' + req.body.blog;

    // Check if the file already exists
    let newFileName = fileName;
    // Check if file with same name exist
    while (fs.existsSync(`public/data/blogs/${newFileName}.txt`)) {
        // Yes: Create new file with _num
        newFileName = `${fileName}_${counter}`;
        counter++;
    }

    fs.writeFile(`public/data/blogs/${newFileName}.txt`, data, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
        } else {
            // OK Header Sent
            res.sendStatus(201);
        }
    });
});

app.get('/blogs', async (req, res) => {
    try {
        const files = await fs.promises.readdir('public/data/blogs');
        blogs = [];

        for (const file of files) {
            const filePath = `public/data/blogs/${file}`;
            const fileContent = await fs.promises.readFile(filePath, 'utf8');

            const lines = fileContent.split(/\r\n|\n/);
            const title = lines[0].split(':')[1].trim();
            const author = lines[1].split(':')[1].trim();
            const date = lines[2].split(':')[1].trim();
            const body = lines.slice(4).join('\n');
            // const uuid = uuidv4();

            // const blog = new BlogData(uuid, title, author, date, body);
            const blog = new BlogData(title, author, date, body);
            blogs.push(blog);
        }
        res.render('blogs.ejs', { allBlogs: blogs });
    } catch (error) {
        console.error('Error reading files:', error);
        res.status(500).send('Internal server error');
    }
});

// Using dynamic route '/view/:blogId' for varying values for the blogId parameter.
/*app.get('/view/:blogId', async (req, res) => {
    // Extract the value of blogId from the URL and makes it available in the req.params object.
    const blogId = req.params.blogId;
    try {
        // Fetch blog data based on blogId (from your data source)
        const blogData = await fetchBlogData(blogId);
        // Render the edit page with the retrieved data
        res.render('view.ejs', { blogTitle: blogData.title, blogBody: blogData.body });
    } catch (error) {
        console.error('Error fetching blog data:', error);
        res.status(500).send('Internal server error');
    }
});*/

// Using query parameters to pass additional information as key-value pairs in the URL.
app.get('/view', (req, res) => {
    // Extract the blog post ID from the query parameter
    const postId = req.query.postId;

    // check the corresponding blog post data
    if (!blogs[postId]) {
        // Handle invalid post ID (e.g., show an error page)
        res.status(404).send('Blog post not found');
        return;
    }

    // Render the view.ejs template and pass the blog post data
    res.render('view.ejs', { blog: blogs[postId] });
});

app.post('/delete', (req, res) => {
    // TODO: 3. Post Update/Delete
    res.sendStatus(201);
    res.render('create.ejs');
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running at ${process.env.PORT}/`);
});
