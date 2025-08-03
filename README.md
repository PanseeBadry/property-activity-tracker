# Property Activity Tracker

A real-time property activity tracking system built with NestJS, MongoDB, and WebSockets. This application tracks sales representative activities across various properties with real-time updates and scoring.

## Features

✅ **Complete Implementation:**
- 🔐 JWT Authentication system
- 👥 Sales Representative management (CRUD)
- 🏠 Property management (CRUD) 
- 📝 Activity tracking with real-time updates
- 🏆 Scoring system with weighted activities
- 🔄 WebSocket real-time notifications
- 📊 Activity replay for offline users
- ✅ Input validation and error handling

## Activity Types & Scoring

- **Visit**: 5 points
- **Call**: 2 points  
- **Inspection**: 8 points (triggers opportunity notification)
- **Follow-up**: 4 points
- **Note**: 1 point

## Architecture

The application follows a modular NestJS structure:

- **Auth Module**: JWT-based authentication
- **Sales Rep Module**: Sales representative management
- **Property Module**: Property CRUD operations
- **Activity Module**: Activity tracking and scoring
- **Socket Module**: Real-time WebSocket communications

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or provide connection string)
- npm or yarn

## Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment**
   - The `.env` file is already created with default settings
   - Update `MONGODB_URI` if using a different MongoDB instance
   - Update `JWT_SECRET` for production use

3. **Start MongoDB**
```bash
# If using local MongoDB
mongod
```

4. **Seed sample data**
```bash
node scripts/seed-data.js
```

5. **Start the application**
```bash
# Development with auto-reload
npm run start:dev

# Production
npm run start:prod
```

6. **Test the API** (optional)
```bash
# Install axios for testing
npm install axios
node scripts/test-api.js
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with sales rep name
- `POST /auth/logout` - Logout (requires auth)

### Sales Representatives  
- `GET /sales-reps` - Get all sales reps
- `GET /sales-reps/:id` - Get sales rep by ID
- `POST /sales-reps` - Create new sales rep
- `PATCH /sales-reps/:id` - Update sales rep
- `DELETE /sales-reps/:id` - Delete sales rep

### Properties
- `GET /properties` - Get all properties
- `GET /properties/:id` - Get property by ID  
- `POST /properties` - Create new property
- `PATCH /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property

### Activities
- `GET /activities` - Get all activities (with filters)
- `GET /activities/:id` - Get activity by ID
- `POST /activities` - Create new activity
- `PATCH /activities/:id` - Update activity  
- `DELETE /activities/:id` - Delete activity

## WebSocket Events

- `user:online` - Notify when user comes online
- `activity:new` - Broadcast new activities
- `activity:replay` - Send missed activities to reconnecting users
- `notification` - Send score milestones and opportunities

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
