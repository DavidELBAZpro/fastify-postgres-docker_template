const fastify = require('fastify')({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true
            }
        }
    }
})
const { log } = require('console')
const swaggerDocument = require('./swagger.json')
require('dotenv').config()

fastify.register(require('@fastify/cors'), {
    origin: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    optionsSuccessStatus: 200, // pour les navigateurs legacy (IE11, divers SmartTV) qui utilisent 204 comme statut par défaut
    preflightContinue: false, // Ne pas passer la requête après la pré-vérification CORS
    verbose: true // Activer les logs détaillés pour les requêtes CORS
})
// fastify.register(require('fastify-swagger'), {
//     exposeRoute: true,
//     routePrefix: '/documentation',
//     swagger: swaggerDocument
// })

const connectionString = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@db:5432/${process.env.POSTGRES_DB}`

// Enregistrement du plugin Fastify pour Postgres
fastify.register(require('@fastify/postgres'), {
    connectionString
})

// Route pour servir le fichier swagger.json
fastify.get('/swagger', async (request, reply) => {
    return swaggerDocument
})


fastify.get('/', {
    schema: swaggerDocument.paths['/'].get
}, async (request, reply) => {
    console.log('The connection string for DBs:', connectionString)
    console.log('The credentials:', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, process.env.POSTGRES_DB)
    return { message: "Bienvenue sur l'API Fastify x Postgres de David E." }
})

// Route pour obtenir la liste des items
fastify.get('/items', {
    schema: swaggerDocument.paths['/items'].get
}, async (request, reply) => {
    request.log.info('Fetching all items')
    const client = await fastify.pg.connect()
    const { rows } = await client.query('SELECT * FROM items')
    client.release()
    return rows
})

// Route pour créer un nouvel item
fastify.post('/items', {
    schema: swaggerDocument.paths['/items'].post
}, async (request, reply) => {
    request.log.info('Creating a new item')
    const client = await fastify.pg.connect()
    const { name, description } = request.body
    const { rows } = await client.query(
        'INSERT INTO items(name, description) VALUES($1, $2) RETURNING *',
        [name, description]
    )
    client.release()
    reply.status(201)
    return rows[0]
})

const opts = {
    port: process.env.PORT || 8080,
    host: '0.0.0.0'
}

const start = async () => {
    try {
        await fastify.listen(opts)
        console.log(`Server listening on ${fastify.server.address().port}`)
        console.log('The connection string for DB:', connectionString)
        console.log('The credentials:', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, process.env.POSTGRES_DB)
        console.log('UPDATE 2 AVEC CORS ')

    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
