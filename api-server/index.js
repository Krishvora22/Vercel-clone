require('dotenv').config()
const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const GitHubStrategy = require('passport-github2').Strategy
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const { Server } = require('socket.io')
const Redis = require('ioredis')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 9000

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vercel-clone', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

// User Schema
const userSchema = new mongoose.Schema({
    githubId: String,
    username: String,
    displayName: String,
    avatar: String,
    accessToken: String,
    refreshToken: String,
    createdAt: { type: Date, default: Date.now }
})

const deploymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectName: String,
    projectSlug: String,
    gitURL: String,
    environmentVariables: [{
        key: String,
        value: String
    }],
    status: { type: String, enum: ['queued', 'building', 'deployed', 'failed'], default: 'queued' },
    deployURL: String,
    buildLogs: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Deployment = mongoose.model('Deployment', deploymentSchema)

const subscriber = new Redis(process.env.REDIS_URL || '')

const io = new Server({ 
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

io.on('connection', socket => {
    console.log('User connected:', socket.id)
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
    })
})

io.listen(9002, () => console.log('Socket Server 9002'))

// AWS Configuration
const ecsClient = new ECSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
})

const config = {
    CLUSTER: process.env.AWS_ECS_CLUSTER || '',
    TASK: process.env.AWS_ECS_TASK_DEFINITION || ''
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}))
app.use(express.json())
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}))

app.use(passport.initialize())
app.use(passport.session())

// Passport Configuration
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:9000/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id })
        if (user) {
            user.accessToken = accessToken
            await user.save()
            return done(null, user)
        } else {
            user = new User({
                githubId: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                avatar: profile.photos[0].value,
                accessToken: accessToken,
                refreshToken: refreshToken
            })
            await user.save()
            return done(null, user)
        }
    } catch (error) {
        return done(error, null)
    }
}))

passport.serializeUser((user, done) => {
    done(null, user._id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        done(null, user)
    } catch (error) {
        done(error, null)
    }
})

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Access token required' })
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' })
        req.user = user
        next()
    })
}

// Routes

// Auth Routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }))

app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: process.env.FRONTEND_URL + '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { userId: req.user._id, username: req.user.username },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        )
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`)
    }
)

app.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        res.json({
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' })
    }
})

// GitHub Repositories
app.get('/api/repos', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
        if (!user || !user.accessToken) {
            return res.status(401).json({ error: 'GitHub access token not found' })
        }

        const response = await axios.get('https://api.github.com/user/repos', {
            headers: {
                'Authorization': `token ${user.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            params: {
                sort: 'updated',
                per_page: 100
            }
        })

        const repos = response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            language: repo.language,
            updatedAt: repo.updated_at,
            private: repo.private
        }))

        res.json(repos)
    } catch (error) {
        console.error('Error fetching repos:', error)
        res.status(500).json({ error: 'Failed to fetch repositories' })
    }
})

// Deployments
app.get('/api/deployments', authenticateToken, async (req, res) => {
    try {
        const deployments = await Deployment.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50)
        res.json(deployments)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch deployments' })
    }
})

app.post('/api/deploy', authenticateToken, async (req, res) => {
    try {
        const { gitURL, projectName, environmentVariables = [] } = req.body
        
        if (!gitURL) {
            return res.status(400).json({ error: 'Git URL is required' })
        }

        const projectSlug = generateSlug()
        const deployURL = `https://${projectSlug}.${process.env.DOMAIN || 'localhost:8000'}`

        // Create deployment record
        const deployment = new Deployment({
            userId: req.user.userId,
            projectName: projectName || 'Untitled Project',
            projectSlug,
            gitURL,
            environmentVariables,
            status: 'queued',
            deployURL
        })
        await deployment.save()

        // Prepare environment variables for container
        const envVars = [
            { name: 'GIT_REPOSITORY__URL', value: gitURL },
            { name: 'PROJECT_ID', value: projectSlug }
        ]

        // Add user-defined environment variables
        environmentVariables.forEach(env => {
            envVars.push({ name: env.key, value: env.value })
        })

        // Spin the container
        const command = new RunTaskCommand({
            cluster: config.CLUSTER,
            taskDefinition: config.TASK,
            launchType: 'FARGATE',
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: 'ENABLED',
                    subnets: process.env.AWS_SUBNETS ? process.env.AWS_SUBNETS.split(',') : ['', '', ''],
                    securityGroups: process.env.AWS_SECURITY_GROUPS ? process.env.AWS_SECURITY_GROUPS.split(',') : ['']
                }
            },
            overrides: {
                containerOverrides: [
                    {
                        name: 'builder-image',
                        environment: envVars
                    }
                ]
            }
        })

        await ecsClient.send(command)

        res.json({ 
            status: 'queued', 
            data: { 
                projectSlug, 
                url: deployURL,
                deploymentId: deployment._id
            } 
        })

    } catch (error) {
        console.error('Deployment error:', error)
        res.status(500).json({ error: 'Deployment failed' })
    }
})

app.get('/api/deployment/:id', authenticateToken, async (req, res) => {
    try {
        const deployment = await Deployment.findOne({ 
            _id: req.params.id, 
            userId: req.user.userId 
        })
        
        if (!deployment) {
            return res.status(404).json({ error: 'Deployment not found' })
        }
        
        res.json(deployment)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch deployment' })
    }
})

// Legacy route for backward compatibility
app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    // Spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: process.env.AWS_SUBNETS ? process.env.AWS_SUBNETS.split(',') : ['', '', ''],
                securityGroups: process.env.AWS_SECURITY_GROUPS ? process.env.AWS_SECURITY_GROUPS.split(',') : ['']
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })
})

async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', async (pattern, channel, message) => {
        try {
            const data = JSON.parse(message)
            const projectId = channel.replace('logs:', '')
            
            // Update deployment status in database
            const deployment = await Deployment.findOne({ projectSlug: projectId })
            if (deployment) {
                if (data.log.includes('Build Complete')) {
                    deployment.status = 'deployed'
                } else if (data.log.includes('error:') || data.log.includes('Error')) {
                    deployment.status = 'failed'
                } else if (data.log.includes('Build Started')) {
                    deployment.status = 'building'
                }
                
                deployment.buildLogs.push(data.log)
                deployment.updatedAt = new Date()
                await deployment.save()
            }
            
            io.to(channel).emit('message', message)
        } catch (error) {
            console.error('Error processing log message:', error)
            io.to(channel).emit('message', message)
        }
    })
}

initRedisSubscribe()

app.listen(PORT, () => console.log(`API Server Running on port ${PORT}`))