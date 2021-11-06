const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, MongoRuntimeError } = require('mongodb');

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5okll.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db("doctors_portal");
        const appointmentsCollection = database.collection("appointments");

        //post appointment 
        app.post('/appointments', async (req, res) => {
            const data = req.body;
            const result = await appointmentsCollection.insertOne(data);
            res.json(result);
        });
        //get appointment
        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);
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