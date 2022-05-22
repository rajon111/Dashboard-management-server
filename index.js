const express = require('express')

const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxr34.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect()
        console.log('connected') 
    }
    finally{

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('GPU manufacturer running!')
})

app.listen(PORT, () => {
    console.log('GPU manufacturer app listening', PORT)
})     

