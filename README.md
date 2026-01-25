# UniSync

A modern, real-time classroom management platform designed to streamline communication and coordination between educators and students.

## Features

### Admin Dashboard
- **Welcome Message**: Personalized greeting with teacher name
- **Class Statistics**: View today's classes and student engagement
- **Real-time Presence Tracking**: Monitor online/offline student status
- **System Status**: Check backend connectivity and system health
- **Student Management**: Manage student profiles and enrollment
- **Schedule Management**: Create and manage class schedules
- **Broadcasting**: Send announcements and updates to students
- **Resource Management**: Organize and distribute learning materials

### Student Portal
- **Dashboard**: View upcoming classes and assignments
- **Notifications**: Real-time alerts for class updates
- **Event Tracking**: Track scheduled events and deadlines
- **Resources**: Access course materials and resources
- **Settings**: Manage personal preferences and profile
- **Presence Tracking**: Automatic online/offline status

## Project Structure

```
unisync-project/
├── index.html                 # Landing page
├── manifest.json             # PWA manifest
├── service-worker.js         # Offline support
├── admin/                    # Admin dashboard
│   ├── js/
│   │   ├── main.js          # Dashboard initialization
│   │   └── components/      # Reusable components
│   ├── css/                 # Admin styling
│   └── *.html               # Admin pages
├── student/                 # Student portal
│   ├── js/
│   │   └── modules/         # Feature modules
│   ├── css/                 # Student styling
│   └── *.html               # Student pages
├── shared/                  # Shared resources
│   ├── js/
│   │   ├── config.js        # App configuration
│   │   ├── supabase_client.js # Database client
│   │   └── api/             # API modules
│   └── css/                 # Global styles
└── assets/                  # Static assets
    ├── css/                 # Global stylesheets
    └── images/              # Icons and images
```

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Real-time**: Supabase Realtime & Presence
- **Architecture**: Progressive Web App (PWA)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd unisync-project
   ```

2. **Configure Supabase**
   - Update `shared/js/config.js` with your Supabase credentials
   - Ensure your database has the required schema

3. **Start the application**
   - Open `index.html` in your browser
   - For local development, use a local web server:
     ```bash
     python -m http.server 8000
     ```
   - Visit `http://localhost:8000`
   - Or simply deploy from a live server in VS Code
   - Dowlnoad live server extension

### Environment Configuration

Create or update `shared/js/config.js`:
```javascript
const SUPABASE_URL = '// CHECK Z:\unisync-project\shared\js\config.js';
const SUPABASE_ANON_KEY = 'CHECK // Z:\unisync-project\shared\js\config.js';
```

## Key Modules

### Authentication (`shared/js/api/auth_api.js`)
- User registration and login
- Session management
- Logout functionality

### User Management (`shared/js/api/user_api.js`)
- Profile management
- User presence tracking
- Role-based access control

### Schedule Management (`shared/js/api/schedule_api.js`)
- Class scheduling
- Schedule queries and filtering
- Event management

### Real-time Features
- Student presence monitoring
- Live notifications
- Instant updates across devices

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## PWA Support

UniSync works as a Progressive Web App:
- Install on home screen
- Offline functionality via Service Worker
- Push notifications

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add your license here]

## Support

For issues or questions, please open an issue or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Admin dashboard
- Student portal
- Real-time presence tracking
- Schedule management
