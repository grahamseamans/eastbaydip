const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { marked } = require('marked');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure marked options
marked.setOptions({
    breaks: true,
    gfm: true,
    mangle: false,
    headerIds: false
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'eastbay-dipping-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    // Create tables in sequence to avoid race conditions
    db.serialize(() => {
        // Content table for main page content
        db.run(`CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_name TEXT UNIQUE,
            markdown_content TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Posts table
        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            markdown_content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Admin users table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT
        )`);

        // Create default admin user (polly/password123)
        const defaultPassword = bcrypt.hashSync('password123', 10);
        db.run(`INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)`,
            ['polly', defaultPassword]);

        // Create default main content
        const defaultContent = `# East Bay Dipping Society

Welcome to the East Bay Dipping Society! We're a community of brave souls who love swimming in the San Francisco Bay year-round.

## About Us

The East Bay Dipping Society meets regularly for invigorating swims in the bay. Whether you're a seasoned cold water swimmer or just curious about taking the plunge, you're welcome to join us!

## What to Expect

- **Cold water swimming** - The bay is refreshing year-round!
- **Community** - Meet fellow water enthusiasts
- **Health benefits** - Cold water swimming has many proven benefits
- **Fun** - Because life's too short for warm pools

For more information about bay swimming safety and locations, visit the [East Bay Regional Parks District](https://www.ebparks.org/).`;

        db.run(`INSERT OR IGNORE INTO content (page_name, markdown_content) VALUES (?, ?)`,
            ['main', defaultContent]);
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.redirect('/admin');
    }
}

// Routes

// Homepage
app.get('/', (req, res) => {
    // Get main content
    db.get('SELECT markdown_content FROM content WHERE page_name = ?', ['main'], (err, content) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        // Get all posts ordered by creation date (newest first)
        db.all('SELECT * FROM posts ORDER BY created_at DESC', (err, posts) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Database error');
            }

            res.render('index', {
                mainContent: content ? marked(content.markdown_content) : '',
                posts: posts.map(post => ({
                    ...post,
                    html: marked(post.markdown_content)
                }))
            });
        });
    });
});

// Admin login page
app.get('/admin', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin-login', { error: null });
});

// Admin login POST
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.render('admin-login', { error: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.render('admin-login', { error: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect('/admin/dashboard');
    });
});

// Admin dashboard
app.get('/admin/dashboard', requireAuth, (req, res) => {
    // Get main content
    db.get('SELECT markdown_content FROM content WHERE page_name = ?', ['main'], (err, content) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        // Get all posts
        db.all('SELECT * FROM posts ORDER BY created_at DESC', (err, posts) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Database error');
            }

            res.render('admin-dashboard', {
                mainContent: content ? content.markdown_content : '',
                posts: posts,
                username: req.session.username
            });
        });
    });
});

// Update main content
app.post('/admin/main-content', requireAuth, (req, res) => {
    const { content } = req.body;

    db.run('UPDATE content SET markdown_content = ?, updated_at = CURRENT_TIMESTAMP WHERE page_name = ?',
        [content, 'main'], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Database error');
            }
            res.redirect('/admin/dashboard');
        });
});

// Create new post
app.post('/admin/posts', requireAuth, (req, res) => {
    const { content } = req.body;

    if (!content.trim()) {
        return res.redirect('/admin/dashboard');
    }

    db.run('INSERT INTO posts (markdown_content) VALUES (?)', [content], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        res.redirect('/admin/dashboard');
    });
});

// Edit post page
app.get('/admin/edit/:id', requireAuth, (req, res) => {
    const postId = req.params.id;

    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, post) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }

        if (!post) {
            return res.status(404).send('Post not found');
        }

        res.render('edit-post', { post });
    });
});

// Update post
app.post('/admin/edit/:id', requireAuth, (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;

    db.run('UPDATE posts SET markdown_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, postId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Database error');
            }
            res.redirect('/admin/dashboard');
        });
});

// Delete post
app.post('/admin/delete/:id', requireAuth, (req, res) => {
    const postId = req.params.id;

    db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        res.redirect('/admin/dashboard');
    });
});

// Change password
app.post('/admin/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;

    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.redirect('/admin/dashboard?error=All fields are required');
    }

    if (newPassword !== confirmPassword) {
        return res.redirect('/admin/dashboard?error=New passwords do not match');
    }

    if (newPassword.length < 6) {
        return res.redirect('/admin/dashboard?error=New password must be at least 6 characters');
    }

    // Get current user
    db.get('SELECT * FROM admin_users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/dashboard?error=Database error');
        }

        if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
            return res.redirect('/admin/dashboard?error=Current password is incorrect');
        }

        // Update password
        const newPasswordHash = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId], (err) => {
            if (err) {
                console.error(err);
                return res.redirect('/admin/dashboard?error=Failed to update password');
            }
            res.redirect('/admin/dashboard?success=Password updated successfully');
        });
    });
});

// Logout
app.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
