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
    methods: ["GET", "POST", "PUT", "OPTIONS", "DELETE", "PATCH"],
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

fastify.get('/items/:id', {
    schema: swaggerDocument.paths['/items/{id}'].get
}, async (request, reply) => {
    const itemId = request.params.id // Récupère l'ID de l'URL
    request.log.info(`Fetching item with ID ${itemId}`)

    const client = await fastify.pg.connect()
    try {
        const { rows } = await client.query('SELECT * FROM items WHERE id = $1', [itemId])
        if (rows.length === 0) {
            reply.code(404).send({ error: 'Item not found' })
        } else {
            return rows[0] // Renvoie le premier élément correspondant à l'ID (doit être unique)
        }
    } catch (error) {
        request.log.error(error)
        reply.code(500).send({ error: 'Internal Server Error' })
    } finally {
        client.release() // Assurez-vous de libérer le client après l'opération
    }
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

fastify.patch('/items/:id', async (request, reply) => {
    const itemId = request.params.id
    const { name, description } = request.body
    request.log.info(`Updating item with ID ${itemId}`)

    const client = await fastify.pg.connect()
    try {
        const updates = []
        const values = []

        if (name) {
            updates.push(`name = $${updates.length + 1}`)
            values.push(name)
        }

        if (description) {
            updates.push(`description = $${updates.length + 1}`)
            values.push(description)
        }

        if (updates.length === 0) {
            return reply.code(400).send({ error: 'No update field provided' })
        }

        const query = `
            UPDATE items
            SET ${updates.join(', ')}
            WHERE id = $${updates.length + 1}
            RETURNING *;
        `
        values.push(itemId)

        const { rows } = await client.query(query, values)
        client.release()

        if (rows.length === 0) {
            return reply.code(404).send({ error: 'Item not found' })
        }

        return reply.code(200).send(rows[0])
    } catch (error) {
        client.release()
        request.log.error(error)
        return reply.code(500).send({ error: 'Internal Server Error' })
    }
})


fastify.delete('/items/:id', async (request, reply) => {
    const itemId = request.params.id
    request.log.info(`Deleting item with ID ${itemId}`)

    const client = await fastify.pg.connect()
    try {
        const { rowCount } = await client.query('DELETE FROM items WHERE id = $1', [itemId])
        client.release()

        if (rowCount === 0) {
            return reply.code(404).send({ error: 'Item not found' })
        }

        return reply.code(204).send() // 204 No Content pour une suppression réussie
    } catch (error) {
        client.release()
        request.log.error(error)
        return reply.code(500).send({ error: 'Internal Server Error' })
    }
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
        console.log("TE EXTRANO BEBE")
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
