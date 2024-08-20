import express from 'express';
import fs from 'fs';
//import { v4 as uuidv4 } from 'uuid';
//import https from 'https';
import pg from 'pg';

const hostname = '0.0.0.0';
const port = 8080;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "bloggingmania",
    password: "------",
    port: 5432,
});
db.connect();

const app = express();
app.use(express.static("public"));
// For data passes by client as json
app.use(express.json());
// For data passes by client as encoded url (replace body parser)
app.use(express.urlencoded({ extended: true }));

/*const options = {
    key: fs.readFileSync('public/testkeys/server.key'),
    cert: fs.readFileSync('public/testkeys/server.crt')
};*/

var blogsContainer = [];

// check if URL includes protocol
function sanitizeUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
        return 'http://' + url;
    }
    return url;
}

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/create', (req, res) => {
    res.render('create.ejs');
});

app.post('/save', async (req, res) => {
    var fileName = req.body.name;
    const blog = req.body.blog.replace(/href="(www\.[^\s"]+)"/g, (match, p1) => {
        return `href="${sanitizeUrl(p1)}"`;
    });
    const d = new Date();
    var blogDate = d.getDate() + '-' + d.getMonth() + '-' + d.getFullYear();

    try {
        await db.query(
            "INSERT INTO blogs (name, title, body, date) VALUES ($1, $2, $3, $4)",
            [req.body.name, req.body.title, blog, blogDate]
        );
        // OK Header Sent
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server: Cannot create new row');
    }
});

app.get('/blogs', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT title, TO_CHAR(date, 'DD Mon YYYY') AS formatted_date, id FROM blogs ORDER BY id ASC;",
        );
        res.render('blogs.ejs', { allBlogs: result.rows });
    } catch (error) {
        console.error('Server: Error database:', error);
        res.status(500).send('Server: Internal server error');
    }
});

// Using query parameters to pass additional information as key-value pairs in the URL.
app.get('/view', async (req, res) => {
    // Extract the blog post ID from the query parameter
    const postId = Number(req.query.postId);
    try {
        const result = await db.query(
            "SELECT id, name, title, body, TO_CHAR(date, 'DD Mon YYYY') AS formatted_date FROM blogs WHERE id=$1;",
            [postId]
        );
        console.log(result.rows[0]);
         // Render the view.ejs template and pass the blog post data
        res.render('view.ejs', { blog: result.rows[0] });
    } catch (error) {
        console.error('Server: Error database:', error);
        // Handle invalid post ID (e.g., show an error page)
        res.status(404).send(`Server: Blog post row with id ${postId} not found`);
        return;
    }
});

app.get('/edit', async(req, res) => {
    // Extract the blog post ID from the query parameter
    const postId = Number(req.query.postId);
    try {
        const result = await db.query(
            "SELECT id, name, title, body FROM blogs WHERE id=$1;",
            [postId]
        );
         // Render the edit.ejs template and pass the blog post data
         res.render('edit.ejs', { passedData: result.rows[0]});
    } catch (error) {
        console.error('Server: Error database:', error);
        // Handle invalid post ID (e.g., show an error page)
        res.status(404).send(`Server: Blog post row with id ${postId} not found`);
        return;
    }
});

// using PATCH endpoint to update blog
app.patch('/append', async (req, res) => {
    let id = 0;
    try {
        // Get id from the query
        const appendid = Number(req.query.blogId);
        if (!appendid) {
            return res.status(400).send('Invalid Blog Id');
        }
        id = appendid;

        try {
            await db.query("UPDATE blogs SET title=$1, body=$2 WHERE id=$3;",
                [req.body.title, req.body.blog, appendid]
            );
        } catch (error) {
            console.log(error);
        }
        // Send a 200 status code indicating success
        res.sendStatus(200);
    } catch (error) {
        console.error(`Server: Error updating row with id ${id}:`, error);
        res.status(500).send('Server: Internal server error');
    }
});

app.delete('/delete', async (req, res) => {
    let id = 0;
    try {
        const deletedid = Number(req.body.id);
        if (!deletedid) {
            return res.status(400).send('Invalid Blog Id');
        }
        id = deletedid;

        try {
            await db.query("DELETE FROM blogs WHERE id=$1;",
                [deletedid]
            );
            console.log(`Server: Row having id ${deletedid} deleted.`);
            // OK Header Sent
            res.sendStatus(201);
        } catch (error) {
            console.log(error);
        }
    } catch (error) {
        console.log(`Server: Error deleting row with id ${id}:`, error);
        res.status(404).json({ error: 'Blog not found' });
    }
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

/*app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running at ${process.env.PORT || 8080}/`);
});*/

/*https.createServer(options, app).listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});*/
