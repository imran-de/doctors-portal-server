const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");
const { MongoClient, MongoRuntimeError } = require('mongodb');

const port = process.env.PORT || 5000;
// firebase token authorization


const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors());
app.use(express.json());

//mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5okll.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req?.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}



async function run() {
    try {
        await client.connect();
        const database = client.db("doctors_portal");
        const appointmentsCollection = database.collection("appointments");
        const usersCollection = database.collection('users');

        //post appointment 
        app.post('/appointments', async (req, res) => {
            const data = req.body;
            const result = await appointmentsCollection.insertOne(data);
            res.json(result);
        });
        //get appointment
        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);
        })
        //user collect
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })

        // post user data
        app.post('/user', async (req, res) => {
            const data = req.body;
            const result = await usersCollection.insertOne(data);
            res.json(result);
        })
        //update or put / upsert user /if user information already added than ignore or add new user information
        app.put('/user', async (req, res) => {
            const data = req.body;
            const filter = { email: data.email };
            const options = { upsert: true };
            const updateDoc = { $set: data }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        // make admin api
        app.put('/users/admin', verifyToken, async (req, res) => {
            const email = req?.body?.email;
            const requester = req?.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount?.role === 'admin') {
                    const filter = { email: email }
                    const updateDoc = { $set: { role: 'admin' } };
                    const user = await usersCollection.findOne(filter);
                    if (user?.role === 'admin') {
                        res.json({ message: 'The user already have admin access, no need to make admin again' })
                    } else if (user === null) {
                        res.json({ message: 'The user not found! check email and try again' })
                    } else {
                        const result = await usersCollection.updateOne(filter, updateDoc);
                        res.json(result);
                    }
                }
            }
            else {
                res.status(403).json({ message: 'you do not have to make admin this user!' })
            }


        })


    }
    finally {
        // await client.close()

    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send("Doctors portal server working perfectly")
})

app.listen(port, () => {
    console.log(`Example app listening at port ${port}`);
})

/*
        //users: get
        //users: post
        //users: put "update user information"
        //users: delete
*/