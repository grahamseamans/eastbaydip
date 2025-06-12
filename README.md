# East Bay Dipping Society Website

A simple, elegant website for the East Bay Dipping Society with admin functionality for managing content.

## Features

- 🌊 Clean, responsive community website
- 🔐 Secure admin panel with authentication
- ✏️ Real-time Markdown editor with live preview
- 📱 Mobile-friendly responsive design
- 🔒 HTTPS with automatic SSL renewal
- 📝 Post management system
- 🎨 Bay-themed blue color scheme

## Admin Access

- **URL:** https://eastbaydip.org/admin
- **Username:** polly
- **Default Password:** password123 (change this immediately!)

## Development

### Local Development

```bash
npm install
node server.js
```

The site will be available at http://localhost:3000

### Deployment

Easy one-command deployment to production:

```bash
./deploy.sh
```

This script will:
- Copy all application files to the server
- Install/update dependencies
- Restart the service
- Verify the deployment
- Preserve the database and user data

### Admin Features

- **Main Content Editor:** Edit the homepage content with Markdown
- **Post Management:** Create, edit, and delete posts
- **Real-time Preview:** See formatted content as you type
- **Password Management:** Change admin password
- **Responsive Layout:** Works great on desktop and mobile

### Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite
- **Templates:** EJS
- **Styling:** Custom CSS
- **Markdown:** Marked.js
- **Server:** Ubuntu + Nginx + systemd
- **SSL:** Let's Encrypt

## File Structure

```
eastbaydip/
├── server.js           # Main application
├── package.json        # Dependencies
├── deploy.sh          # Deployment script
├── views/             # EJS templates
│   ├── index.ejs      # Homepage
│   ├── admin-login.ejs
│   ├── admin-dashboard.ejs
│   └── edit-post.ejs
└── public/            # Static files
    └── style.css      # Main stylesheet
```

## Contributing

1. Make your changes locally
2. Test with `node server.js`
3. Deploy with `./deploy.sh`
4. Verify at https://eastbaydip.org

---

Made with 🌊 for the brave souls who love cold water swimming in the San Francisco Bay!
Primarily authored by Claude 4, with help from Graham
