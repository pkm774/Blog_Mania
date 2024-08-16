import express from 'express';
import bodyParser from "body-parser";
import fs from 'fs';
//import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const hostname = '192.168.0.107';
const port = 8080;

const app = express();
app.use(express.static("public"));
// For data passes by client as json
app.use(express.json());
// For data passes by client as encoded url
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

const d = new Date();
var blogDate = d.getDate() + '-' + d.getMonth() + '-' + d.getFullYear();


// Declaration of Blog Class and Map
var blogsContainer = new Map();
class BlogData {
    //constructor(uuid, tittle, name, date, body) {
    constructor(filename, tittle, name, date, body) {
        this.filename = filename;
        this.tittle = tittle;
        this.name = name;
        this.date = date;
        this.body = body;
    }
}

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

// remove '..' directory traversal characters
function sanitizeFilename(filename) {
    return filename
    // remove '..' directory traversal characters
        .replace(/(\.\.)+/g, '')
    // remove '/' and '\' characters
        .replace(/[\/\\]/g, '');
}

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/create', (req, res) => {
    res.render('create.ejs');
});

app.post('/save', (req, res) => {
    // Create blog file
    var fileName = req.body.name;
    fileName = sanitizeFilename(fileName);

    // Check if the file already exists
    let newFileName = fileName;
    // Check if file with same name exist
    while (fs.existsSync(`public/data/blogs/${newFileName}.txt`)) {
        // Yes: Create new file with _num
        newFileName = `${fileName}_${counter}`;
        counter++;
    }

    const filename = 'File Name: ' + newFileName + '.txt';
    const blogData = '\nTittle: ' + req.body.tittle + '\nAuthor: ' + fileName + '\nDate: ' + blogDate + '\n\n' + req.body.blog;
    const data = filename + blogData;

    fs.writeFile(`public/data/blogs/${newFileName}.txt`, data, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server: Internal server error');
        } else {
            // OK Header Sent
            res.sendStatus(201);
        }
    });
});

app.get('/blogs', async (req, res) => {
    try {
        const files = await fs.promises.readdir('public/data/blogs');
        blogsContainer = new Map();
        var Id = 0;

        for (const file of files) {
            const filePath = `public/data/blogs/${file}`;
            const fileContent = await fs.promises.readFile(filePath, 'utf8');

            const lines = fileContent.split(/\r\n|\n/);
            const filename = lines[0].split(':')[1].trim();
            const title = lines[1].split(':')[1].trim();
            const author = lines[2].split(':')[1].trim();
            const date = lines[3].split(':')[1].trim();
            const body = lines.slice(5).join('\n');
            const blogId = Id;

            // const blog = new BlogData(uuid, title, author, date, body);
            const blog = new BlogData(filename, title, author, date, body);
            blogsContainer.set(Number(blogId), blog);
            Id++;
        }
        res.render('blogs.ejs', { allBlogs: blogsContainer });
    } catch (error) {
        console.error('Server: Error reading files:', error);
        res.status(500).send('Server: Internal server error');
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
    const postId = req.query.postId.toString();

    // check the corresponding blog post data
    if (!blogsContainer.get(Number(postId))) {
        // Handle invalid post ID (e.g., show an error page)
        res.status(404).send('Server: Blog post not found');
        return;
    }

    // Render the view.ejs template and pass the blog post data
    res.render('view.ejs', { blog: blogsContainer.get(Number(postId)) });
});

app.get('/edit', (req, res) => {
    // Extract the blog post ID from the query parameter
    const postId = req.query.postId;
    res.render('edit.ejs', { passedData: blogsContainer.get(Number(postId)) });
});

/*app.post('/append', async (req, res) => {
    try {
        // Get filename from the body
        const fileName = req.query.fileName;
        const modifyFile = `public/data/blogs/${fileName}`;
        const fileContent = await fs.promises.readFile(modifyFile, 'utf8');

        // Split the content into lines
        const lines = fileContent.split(/\r\n|\n/);

        // Update the title line
        lines[1] = `Tittle: ${req.body.tittle}`;

        // Replace content from the 6th line onward with req.body.content
        if (lines.length >= 6) {
            lines.splice(5, lines.length - 5, req.body.blog);
        }

        // Join the lines back together
        const updatedContent = lines.join('\n');

        await fs.promises.writeFile(modifyFile, updatedContent, 'utf8');

        // OK Header Sent
        res.sendStatus(201);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server: Internal server error');
    }
});*/

// using PATCH endpoint to update blog
app.patch('/append', async (req, res) => {
    try {
        // Get filename from the query
        var fileName = req.query.fileName;
        if (!fileName || typeof fileName !== 'string') {
            return res.status(400).send('Invalid file name');
        }
        fileName = sanitizeFilename(fileName);

        // filename already has its extension
        const modifyFile = `public/data/blogs/${fileName}`;
        if (!fs.existsSync(modifyFile)) {
            return res.status(404).send('File not found');
        }

        // Read the existing file content
        const fileContent = await fs.promises.readFile(modifyFile, 'utf8');

        // Split the content into lines
        const lines = fileContent.split(/\r\n|\n/);

        // Update the title line
        if (lines.length >= 2) {
            lines[1] = `Tittle: ${req.body.tittle}`;
        } else {
            lines.push(`Tittle: ${req.body.tittle}`);
        }

        // Replace content from the 6th line onward with req.body.content
        if (lines.length >= 6) {
            lines.splice(5, lines.length - 5, req.body.blog);
        } else {
            lines.push(req.body.blog);
        }

        // Join the lines back together
        const updatedContent = lines.join('\n');

        // Write the updated content to the file
        await fs.promises.writeFile(modifyFile, updatedContent, 'utf8');

        // Send a 200 status code indicating success
        res.sendStatus(200);
    } catch (error) {
        console.error('Server: Error updating file:', error);
        res.status(500).send('Server: Internal server error');
    }
});

/*app.post('/delete', (req, res) => {
    const postId = Number(req.body.id);

    if (blogsContainer.get(postId)) {
        const deleteFileName = blogsContainer.get(postId).filename;
        const filePath = `public/data/blogs/${deleteFileName}`;

        // Delete the Blog file
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Server: Error Deleting file: ${err}`);
                return;
            }
            console.log(`Server: File ${filePath} has been successfully removed.`);
        });

        // OK Header Sent
        res.sendStatus(201);
    } else {
        console.log('Server: No Such file !');
    }
});*/

app.delete('/delete', (req, res) => {
    const postId = Number(req.body.id);

    if (blogsContainer.get(postId)) {
        const deleteFileName = blogsContainer.get(postId).filename;
        const filePath = `public/data/blogs/${deleteFileName}`;

        // Delete the Blog file
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Server: ${err}`);
                console.log(`Server: File ${filePath} doesn't exist !`);
                return res.status(500).json({ error: 'Error deleting file', details: err.message });
            }
            console.log(`Server: File ${filePath} has been successfully removed.`);
            // OK Header Sent
            res.sendStatus(201);
        });
    } else {
        console.log(`Server: File ${filePath} doesn't exist !`);
        res.status(404).json({ error: 'File not found' });
    }
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

/*app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});*/

app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running at ${process.env.PORT}/`);
});
